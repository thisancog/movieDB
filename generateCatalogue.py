# coding: utf-8

import os
import subprocess
import re
import shlex
import json
import unicodedata
from string import Template
from datetime import datetime
from imdb import IMDb


########### Settings ###########

#	videoExtensions:	list of all video file extensions to include for scanning
#	searchDir:			the name of or the relative path to the directory to scan
#	jsonFileName:		the name of the catalogue file
#	start:				the index of the first file in the list to scan
#	amount:				amount of files to scan. -1 for all
#
#	start/amount:		to skip rescanning of other files, you may skip ahead by (start) of files
#						and stop after the (amount)-th file

videoExtensions = ['avi', 'flv', 'gifv', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'ogv', 'webm', 'wmv']
searchDir = 'Filme'
jsonFileName = 'catalogue.json'
start = 0
amount = -1


########### External documentation ###########
#	IMDb:				https://imdbpy.github.io/







######### Don't change anything after this line #########

oldFiles = ''
total = 0
i = 0
ia = IMDb()

def main():
	readOldFiles()
	files = getFileList()
	writeJSON(files)
	writeHTML(files)



######### File handling #########

# read old list and filter out entries without imdbID and deleted/renamed files
def readOldFiles():
	global oldFiles	

	root = os.path.join(os.path.dirname(os.path.realpath(__file__)), searchDir)

	with open(jsonFileName) as json_file:
		oldFiles = json.load(json_file)

	oldFiles[:] = [entry for entry in oldFiles if 'ID' in entry and os.path.isfile(root + entry['path'])]


# iterate over all new files and get all relevant information
def getFileList():
	global total, i
	root = os.path.join(os.path.dirname(os.path.realpath(__file__)), searchDir)
	allFiles = getAllVideos(root)
	newFiles = []
	total = len(allFiles)

	for i, file in enumerate(allFiles):
		scanned = isAlreadyScanned(file)
		if scanned != False:
			continue

		title, director, year = parseFileData(file)

		if year == '':
			log('Error: Wrong file name format: %s' % getRelativePath(file))
			continue
		else:
			ID        = getUniqueFileID(file)
			fileInfo  = getVideoInformation(file)
			movieInfo = getIMDbData(title, director, year, file)

			if not isinstance(movieInfo, dict) or 'imdbID' not in movieInfo:
				if movieInfo == False:
					log('Error: Could not find anything for "%s" (%s) on IMDb. Wrong title or year?' % (title, year))

				imdbID    = ''
				movieInfo = {}
				movieInfo['directors'] = [director]
				movieInfo['year'] = year
			else:
				log('New: %s (%s)' % (title, year))
				imdbID = movieInfo['imdbID']
				movieInfo.pop('imdbID', None)

			newFiles.append({
				'ID':			ID,
				'imdbID':		imdbID,
				'path':			getRelativePath(file),
				'title':		title,
				'fileInfo':		fileInfo,
				'movieInfo':	movieInfo
			})

	return mergeFilesAndOldFiles(newFiles)


# find all videos in the search path
def getAllVideos(path):
	allVideos = []

	for path, subdirs, files in os.walk(path):
		for file in files:
			fileType = getFileType(file)
			if fileType == 'video':
				allVideos.append(os.path.join(path, file))

	return allVideos[start:(start + amount)] if amount != -1 else allVideos[start:]


# determine file type
def getFileType(file):
	ext = getExtension(file)
	return 'video' if ext in videoExtensions else ext


# get file extension
def getExtension(file):
	title, ext = os.path.splitext(file)
	ext = ext[1:]
	return ext


# parse file title and get movie title, director and year
def parseFileData(file):
	fileName = os.path.splitext(os.path.basename(file))[0]

	parts    = fileName.split('_')
	title    = parts[0]  if len(parts) > 0  else ''
	director = parts[1]  if len(parts) == 3 else ''
	year     = parts[-1] if len(parts) > 1  else ''

	return title.strip(), director, year


# get file's relative path to the working directory
def getRelativePath(file):
	return file.replace(os.getcwd() + '/' + searchDir, '')


# extract information about video file
def getVideoInformation(file):
	fileType = getFileType(file)
	info = {}

	cmd = 'ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height,duration,bit_rate,codec_name -of default=noprint_wrappers=1'
	args = shlex.split(cmd)
	args.append(file)

	try:
		output = subprocess.check_output(args).decode('utf8')
		output = output.splitlines()
		for line in output:
			line = line.split('=')
			info[line[0]] = line[1]
	except subprocess.CalledProcessError as e:
		return info

	if 'duration' not in info or not info['duration'].isnumeric():
		info['duration'] = getVideoLength(file)

	if not info['bit_rate'].isnumeric():
		info['bit_rate'] = '?'

	audioLanguages = getVideoAudioLanguages(file)
	info['audio_languages'] = audioLanguages

	subtitleLanguages = getVideoSubtitleLanguages(file)
	info['subtitle_languages'] = subtitleLanguages

	return info


# get video audio channel languages
def getVideoAudioLanguages(file):
	languages = []

	cmd = 'ffprobe -show_entries stream=index:stream_tags=language -select_streams a -v 0 -of compact=p=0:nk=1'
	args = shlex.split(cmd)
	args.append(file)

	try:
		output = subprocess.check_output(args).decode('utf8')
		output = output.splitlines()
		for line in output:
			line = line.split('|')
			if len(line) < 2:
				languages.append(getLanguageNiceName("und"))
			else:
				languages.append(getLanguageNiceName(line[1]))
	except subprocess.CalledProcessError as e:
		return ''

	return languages


# get subtitle channel languages
def getVideoSubtitleLanguages(file):
	languages = []

	cmd = 'ffprobe -v quiet -select_streams s -show_entries stream=index:stream_tags=language -of csv=p=0'
	args = shlex.split(cmd)
	args.append(file)

	try:
		output = subprocess.check_output(args).decode('utf8')
		output = output.splitlines()
		for line in output:
			line = line.split(',')
			if len(line) < 2:
				languages.append(getLanguageNiceName("und"))
			else:
				languages.append(getLanguageNiceName(line[1]))
	except subprocess.CalledProcessError as e:
		return ''

	return languages


# get video length if getVideoInformation fails
def getVideoLength(video):
	if getFileType(video) != 'video':
		return False

	process = subprocess.Popen(['ffmpeg', '-i', video], stdout = subprocess.PIPE, stderr = subprocess.STDOUT)
	stdout, stderr = process.communicate()
	matches = None

	try:
		stdout = stdout.decode()
		matches = re.search(r"Duration:\s{1}(?P<hours>\d+?):(?P<minutes>\d+?):(?P<seconds>\d+\.\d+?),", stdout, re.DOTALL)
	except:
		pass

	if matches is None:
		return False
	matches = matches.groupdict()
	return int(matches['hours']) * 3600 + int(matches['minutes']) * 60 + int(round(float(matches['seconds'])))


# read and handle IMDb data about a given movie
def getIMDbData(title, director, year, file):
	info = {}

	normalisedTitle = normaliseString(title)
	movies = ia.search_movie(normalisedTitle)
	movie = False
	found = False

	while not found and len(movies) > 0:
		movie  = movies.pop(0)
		imdbID = movie.movieID
		ID     = getUniqueFileID(file)
		movie  = ia.get_movie(imdbID)
		found  = True

		alreadyExists = findExistingEntry(ID)
		if alreadyExists != False:
			return alreadyExists

		if 'year' not in movie:
			found = False
		elif int(movie['year']) != int(year):
			found = False

		if not found:
			logYear = movie['year'] if 'year' in movie else ('? %d' % int(year))
			log('  Checking "%s" (%s)...' % (movie['title'], logYear))

	if not found or not movie:
		return False

	info['camera']    = parsePeople(movie['cinematographers']) if 'cinematographers' in movie else ''
	info['cast']      = parsePeople(movie['cast']) if 'cast' in movie else ''
	info['music']     = parsePeople(movie['composers']) if 'composers' in movie else ''
	info['countries'] = movie['countries'] if 'countries' in movie else ''
	info['coverurl']  = getCoverUrl(movie)
	info['directors'] = getDirectors(movie, director)
	info['editors']   = parsePeople(movie['editors']) if 'editors' in movie else ''
	info['genres']    = movie['genres'] if 'genres' in movie else ''
	info['languages'] = movie['languages'] if 'languages' in movie else ''
	info['imdbID']    = imdbID
	info['rating']    = movie['rating'] if 'rating' in movie else ''
	info['plot']      = getPlot(movie)
	info['year']      = year

	ia.update(movie, 'release info')
	akas = movie.get('akas from release info', [])
	titleOriginal = ''

	for aka in akas:
		if '(original title)' in aka:
			titleOriginal = aka.replace('(original title)', '').strip()
			break

	info['titleOriginal'] = titleOriginal if normaliseString(titleOriginal) != normaliseString(title) else ''

	return info


# generate id for a file
def getUniqueFileID(file):
	return hash(file)


# check if file was already scanned
def isAlreadyScanned(file):
	path = getRelativePath(file)
	for item in oldFiles:
		if 'path' in item and item['path'] == path:
			if 'imdbID' in item and item['imdbID'] != '':
				return item
	return False


# check if file is already in old list
def findExistingEntry(ID):
	for item in oldFiles:
		if 'ID' in item and item['ID'] == ID:
			return item
	return False


# find cover url for a movie
def getCoverUrl(movie):
	cover = ''
	if 'full-size cover url' in movie:
		cover = movie['full-size cover url']
	elif 'cover url' in movie:
		cover = movie['cover url']
	return cover


# get list of directors of a movie
def getDirectors(movie, defaultDirector):
	if 'directors' in movie:
		return parsePeople(movie['directors'])
	elif 'director' in movie:
		return parsePeople(movie['director'])
	else:
		return [defaultDirector]


# get plot for a movie
def getPlot(movie):
	plot = ''
	if 'plot outline' in movie:
		plot = movie['plot outline']
	elif 'plot' in movie:
		plot = movie['plot']
	elif 'synopsis' in movie:
		plot = movie['synopsis']

	plot = plot[0] if isinstance(plot, list) else plot
	return plot.split('::')[0]


# handle people lists
def parsePeople(people):
	people = [people] if not isinstance(people, list) else people
	people = [p['name'] for p in people]
	return people[:3]


# get language nice name
def getLanguageNiceName(slug):
	languages = { "ara": "Arabic", "ben": "Bengali", "chi": "Chinese", "ces": "Czech", "cze": "Czech", "dan": "Danish", "de": "German", "deu": "German", "dut": "Dutch", "ell": "Greek", "eng": "English", "fin": "Finnish", "fra": "French", "fre": "French", "ger": "German", "gre": "Greek", "heb": "Hebrew", "hrv": "Croatian", "hun": "Hungarian", "isl": "Icelandic", "ita": "Italian", "jpn": "Japanese", "nor": "Norwegian", "per": "Farsi", "pol": "Polish", "por": "Portuguese", "rom": "Romanian", "rum": "Romanian", "rus": "Russian", "spa": "Spanish", "srp": "Serbian", "swe": "Swedish", "tur": "Turkish", "und": "undetermined", "vie": "Vietnamese", "zul": "Zulu" }
	if slug and slug in languages:
		return languages[slug]
	log("  Unknown language slug: " + slug)
	return slug

# add newly added files to the old list
def mergeFilesAndOldFiles(newFiles):
	newFiles[:] = [file for file in newFiles if file != False]

	for oldFile in oldFiles:
		if 'imdbID' in oldFile and oldFile['imdbID'] != '':
			newFiles.append(oldFile)
	
	newFiles = naturalSort(newFiles)
	return newFiles


def normaliseString(var):
	return unicodedata.normalize('NFKD', var.replace('ß', 'ss')).encode('ASCII', 'ignore')


# write file list to .json file
def writeJSON(files):
	f = open(jsonFileName, 'r')
	s = json.dumps(files, indent = 2)
	writeFile(jsonFileName, s)


# construct .html file
def writeHTML(files):
	f = open('html/template.html', 'r')
	s = f.read()
	now = datetime.now()
	s = s.replace('DATE', now.strftime("%d.%m.%Y %H:%M:%S"))
	s = s.replace('CATALOGUE', json.dumps(files))
	writeFile('index.html', s)


# write contents to a file
def writeFile(path, content):
	if not os.path.exists('html'):
		os.makedirs('html')

	with open(path, 'w') as file:
		file.write(content)


# echo a message to the log
def log(msg):
	current = str(start + i + 1).zfill(len(str(total)))
	counter = '[%s/%d]' % (current, total)
	print('%s %s' % (counter, msg))


# sort all files naturally by title
def naturalSort(l):
	convert = lambda text: int(text) if text.isdigit() else text.lower()
	alphanum = lambda key: [convert(c) for c in re.split('([0-9]+)', os.path.splitext(os.path.basename(key['title']))[0])]
	return sorted(l, key = alphanum)



if __name__ == '__main__':
	main()