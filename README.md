# movieDB
A simple command line tool to generate a nicely formatted list of movies in a given directory.


## What it does

This tool scans a given directory for any video files, extracts information about the movie, the file quality etc., adds information from IMDb and generates a nicely formatted HTML page for you to browse through your movie library.

## What you need

As is, the tool runs from the command line. You'll need:

* [Python](https://www.python.org/download/releases/3.0/) version 3.x (already installed on computers)
* [ffmpeg](https://ffmpeg.org/) (often already installed, but you should update it)
* [IMDbPY](https://imdbpy.github.io/)

## How your files need to be set up

Place all files of this repository in the root directory of your movie database. It should contain a sub-directory "Filme" which contains all the video files you wish to scan. You can organise them in here however you like.
All video files should be named based on the pattern Title_Director_Year, e.g. *The Godfather_Francis Ford Coppola_1972.mp4*
The script will recognise all common video file formats.

As I was too lazy to offer a way to customise this, you will have to dig into the code to change these prerequisites yourself:
* Variable `searchDir` of `generateCatalogue.py`on line 26 contains the name of the sub-directory your video files are placed in.
* The pattern file name pattern comes into play in the `parseFileData` function on line 145 of `generateCatalogue.py`. Change this function, if you need.
* You can find a list of all accepted video file extensions on line 25 of `generateCatalogue.py`, if you like to make any changes.

## How to run

From your command line interface, navigate to the directory you placed the script in and run:

```$ python3 generateCatalogue.py```

The first run will likely take a while, as each video file will be checked. When everything is done, two files – `index.html` and `catalogue.json` – are going to be created in the script directory. Open `index.html` in any browser to view the newly created movie catalogue.
You can also copy the `index.html` files together with the `html` sub-directory to any other destination.

## Miscellaneous

All movie information is being stored in the file `catalogue.json`. For later scans, the script is going to skip the files that were already scanned. To force a rescan of a video file, you can either delete its information in the catalogue file, move it to another directory or rename, rescan and rename again.

If a video file can not be matched with IMDb data, make sure that you spelled its title correctly and that the year of release matches the official date found on IMDb.

If you choose a movie title other than the original title (capitalisation sensitive), e.g. the title of a local release, it will probably also be found on IMDb. The catalogue will then display both the original title and the one that you chose.

In order to avoid CORS errors in local environments, a complete copy of the data in `catalogue.json` is going to be written into `index.html`. This adds unnecessary redundancy, but you can change this behaviour on line 422 of `generateCatalogue.py`, making the .html file leaner. In that event, the JavaScript will fetch all information from the .json file.