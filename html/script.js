'use strict';

(function() {
	/*
		File: 	audio codec
				audio bitrate
	*/


	var settings = {
		
	};

	var files, list, movies, count, statistics, sortBySelect, orderSelect, searchField, randomBtn, allBtn, filterAmount, pageTitle;

	window.addEventListener('load', function() {
		if (typeof data !== 'undefined') {
			files = data;
			init();
		} else {
			fetch('catalogue.json?' + Math.floor(Math.random() * 1000000))
			.then(response => response.json())
			.then(data => {
				files = data;
				init();
			});
		}
	});


	var init = function() {
		registerElements();
		buildList();
		buildStatistics();
		registerEvents();
	}

	var registerElements = function() {
		count        = document.querySelector('.movie-count');
		statistics   = document.querySelector('.movie-statistics');
		list         = document.querySelector('.movies');
		sortBySelect = document.querySelector('#sortby');
		orderSelect  = document.querySelector('#order');
		searchField  = document.querySelector('#search');
		randomBtn    = document.querySelector('#random');
		allBtn       = document.querySelector('#all');
		filterAmount = document.querySelector('.movies-filtered-amount');
		pageTitle    = document.querySelector('.page-title');
	};

	var registerEvents = function() {
		toggleInfos();

		sortBySelect.addEventListener('change', sortFiles);
		orderSelect.addEventListener('change', sortFiles);
		searchField.addEventListener('input', filterFiles);
		randomBtn.addEventListener('click', getRandomFile);
		pageTitle.addEventListener('click', resetList);
		allBtn.addEventListener('click', resetList);


		document.addEventListener('keydown', keyDown);
	};



	/************************************************************
		Build list
	 ************************************************************/

	var buildList = function() {
		sortFilesByTitle(false);

		list.innerHTML = '';

		files.forEach(function(file, index) {
			file.index = index;

			var elem = buildEntry(file);
			list.appendChild(elem);
		});

		count.innerHTML = files.length + ' movies';
		movies = [].slice.call(list.querySelectorAll('.movie'));
	}

	var buildEntry = function(entry) {
		var elem        = document.createElement('div'),
			director    = entry.movieInfo.directors[0] || '',
			country     = getCountry(entry, true),
			duration    = calculateDuration(entry),
			cover       = buildCover(entry),
			mainInfo    = buildMainInfo(entry),
			cast        = buildCast(entry),
			contentInfo = buildContentInfo(entry),
			fileInfo    = buildFileInfo(entry),
			c = `<div class="movie-heading">
					<div class="movie-title">
						<h2 class="movie-title-common">${entry.title || 'n/a'}</h2>
						<span class="movie-title-original">${entry.movieInfo.titleOriginal || ''}</span>
					</div>
					<div class="movie-shortinfo">
						<span class="movie-director">${director}</span>
						<span class="movie-misc">
						(<span class="movie-country">${country}</span>, <span class="movie-year">${entry.movieInfo.year}</span>)
						</span>
					</div>
				</div>
				<div class="movie-body">
					<div class="movie-cover">${cover}</div>
					<div class="movie-info">
						${mainInfo}
						${cast}
						${contentInfo}
						${fileInfo}
					</div>
				</div>`;

		elem.innerHTML = c;
		elem = addSortParameters(elem, entry);
		elem.classList.add('movie');
		return elem;
	}

	var calculateDuration = function(entry) {
		if (!entry.fileInfo.duration) return 'n/a';

		var duration = entry.fileInfo.duration,
			hours    = Math.floor(duration / 3600),
			minutes  = Math.floor(duration / 60 % 60),
			seconds  = duration % 60,
			padZeros = val => val.toString().padStart(2, '0');

		return padZeros(hours) + ':' + padZeros(minutes) + ':' + padZeros(seconds);
	}

	var buildCover = function(entry) {
		var cover = getObjAttribute(entry.movieInfo, 'coverurl');
		return (cover) ? `<img src="${cover}" width="100" height="150">` : '';
	}

	var buildMainInfo = function(entry) {
		var duration   = calculateDuration(entry),
			genres     = getObjAttribute(entry.movieInfo, 'genres'),
			countries  = getCountry(entry).join(', '),
			languages  = getObjAttribute(entry.movieInfo, 'languages'),
			langAmount = languages.length;

		genres    = genres ? genres.join(', ') : '';
		languages = languages ? languages.join(', ') : '';

		return `<div class="main-info movie-section">
			<div class="year"><span>Year of release</span><span>${entry.movieInfo.year}</span></div>
			<div class="genre"><span>Genre</span><span>${genres}</span></div>
			<div class="duration"><span>Duration</span><span>${duration}</span></div>
			<div class="country"><span>Country</span><span>${countries}</span></div>
			<div class="language"><span>Original language${langAmount > 1 ? 's' : ''}</span><span>${languages}</span></div>
		</div>`;
	};

	var buildCast = function(entry) {
		var directors = getObjAttribute(entry.movieInfo, 'directors'),
			camera    = getObjAttribute(entry.movieInfo, 'camera'),
			editors   = getObjAttribute(entry.movieInfo, 'editors'),
			cast      = getObjAttribute(entry.movieInfo, 'cast'),
			music     = getObjAttribute(entry.movieInfo, 'music');

		directors = directors ? directors.join(', ') : '';	
		camera    = camera    ? camera.join(', ') : '';
		editors   = editors   ? editors.join(', ') : '';
		cast      = cast      ? cast.join(', ') : '';
		music     = music     ? music.join(', ') : '';

		return `<div class="cast-info movie-section">
			<div class="director"><span>Director</span><span>${directors}</span></div>
			<div class="camera"><span>Camera</span><span>${camera}</span></div>
			<div class="editor"><span>Editor</span><span>${editors}</span></div>
			<div class="cast"><span>Cast</span><span>${cast}</span></div>
			<div class="music"><span>Music</span><span>${music}</span></div>
		</div>`;
	}

	var buildContentInfo = function(entry) {
		var plot    = getObjAttribute(entry.movieInfo, 'plot', '-'),
			rating  = getObjAttribute(entry.movieInfo, 'rating'),
			trailer = encodeURI(entry.title + ' trailer'),
			imdb    = entry.imdbID
				    ? `<div class="imdb"><span>IMDb</span><span><a href="https://www.imdb.com/title/tt${entry.imdbID}" target="_blank" rel="noopener">More info</a></span></div>`
				    : '';
		rating = rating ? rating.toFixed(1) : '';

		return `<div class="content-info movie-section">
			<div class="plot"><span>Plot</span><span>${plot}</span></div>
			<div class="rating"><span>Rating</span><span>${rating}</span></div>
			<div class="trailer"><span>Trailer</span><span><a href="https://www.youtube.com/results?search_query=${trailer}" target="_blank" rel="noopener">search on YouTube</a></span></div>
			${imdb}
		</div>`;
	}

	var buildFileInfo = function(entry) {
		var resolution         = getFileResolution(entry),
			videoBitrate       = getObjAttribute(entry.fileInfo, 'bit_rate', '?'),
			videoCodec         = getObjAttribute(entry.fileInfo, 'codec_name', '?'),
			audioLanguages     = getObjAttribute(entry.fileInfo, 'audio_languages', []),
			subtitleLanguages  = getObjAttribute(entry.fileInfo, 'subtitle_languages', []),
			audioLangAmount    = audioLanguages.length;

		audioLanguages    = audioLanguages    ? audioLanguages.join(', ')    : '';
		subtitleLanguages = subtitleLanguages ? subtitleLanguages.join(', ') : '';

		if (videoBitrate !== '?') {
			videoBitrate = videoBitrate > 1000000
						 ? (videoBitrate / 1000000).toFixed(1) + ' Mbit/s'
						 : (videoBitrate / 1000).toFixed(1) + ' kbit/s';
		}

		return `<div class="file-info movie-section">
			<div class="video-resolution"><span>Video resolution</span><span>${resolution}</span></div>
			<div class="video-bitrate"><span>Video bitrate</span><span>${videoBitrate}</span></div>
			<div class="video-codec"><span>Video codec</span><span>${videoCodec}</span></div>
			<div class="audio-bitrate"><span>Audio bitrate</span><span>${entry.audioBitrate || '?'}</span></div>
			<div class="audio-languages"><span>Audio language${audioLangAmount > 1 ? 's' : ''}</span><span>${audioLanguages || '?'}</span></div>
			<div class="subtitles"><span>Subtitles</span><span>${subtitleLanguages || '–'}</span></div>
			<div class="movie-path"><span>Path</span><span>${entry.path}</span></div>
		</div>`;
	}

	var getFileResolution = function(entry, prettyFormat = true) {
		var resolution = (typeof entry.fileInfo.width !== 'undefined' && typeof entry.fileInfo.height !== 'undefined')
					   ? [entry.fileInfo.width, entry.fileInfo.height]
					   : [];

		return prettyFormat ? resolution.join(' x ') : resolution.reduce((acc, val) => acc * val, 1);
	}

	var getCountry = function(entry, singleCountry = false) {
		var countries = getObjAttribute(entry.movieInfo, 'countries') || [''];
		return singleCountry ? countries[0] : countries;
	}

	var addSortParameters = function(elem, entry) {
		elem.dataset.id         = entry.index;
		elem.dataset.director   = entry.movieInfo.directors.map(dir => dir.split(' ').pop()).join(' ');
		elem.dataset.year       = entry.movieInfo.year;
		elem.dataset.title      = entry.title;

		elem.dataset.country    = getCountry(entry, true);
		elem.dataset.rating     = getObjAttribute(entry.movieInfo, 'rating', 0);
		elem.dataset.resolution = getFileResolution(entry, false);

		return elem;
	}

	var getObjAttribute = function(obj, attr, defaultPlaceholder = '') {
		return typeof obj[attr] !== 'undefined' && obj[attr] ? obj[attr] : defaultPlaceholder;
	}



	/************************************************************
		Build statistics
	 ************************************************************/

	var buildStatistics = function() {
		var duration      = 0,
			year          = 0,
			durationCount = 0,
			yearCount     = 0;

		files.forEach(function(file) {
			if (typeof file.fileInfo.duration !== 'undefined') {
				duration += file.fileInfo.duration;
				durationCount++;
			}

			if (typeof file.movieInfo.year !== 'undefined') {
				year += parseInt(file.movieInfo.year);
				yearCount++;
			}
		});

		if (durationCount > 0)	duration = Math.floor(duration / durationCount);
		if (yearCount > 0)		year     = Math.floor(year / yearCount);

		duration = calculateDuration({fileInfo: { duration: duration }});
		statistics.innerHTML = `Average runtime: ${duration} – Average year of release: ${year}`;
	}



	/************************************************************
		Toggle infos
	 ************************************************************/

	var toggleInfos = function() {
		var toggleMovieBody = function(e) {
			var movie = e.target.closest('.movie');
			movie.classList.toggle('show-more');
		};

		movies.forEach(function(movie) {
			var head = movie.querySelector('.movie-heading');
			head.addEventListener('click', toggleMovieBody);
		});
	}


	/************************************************************
		Sort files
	 ************************************************************/

	var sortFiles = function() {
		var mode = sortBySelect.value;
		switch (mode) {
			case 'title':
				sortFilesByTitle();
				break;
			default:
				sortFilesByGenericParam(mode);
				break;
		}
	}

	var sortFilesByTitle = function(updateList = true) {
		var articles = ['a', 'an', 'the', 'der', 'das', 'die', 'ein', 'eine', 'le', 'la', 'il', 'un', 'une', 'les', 'el', 'l'],
			ascending = orderSelect.value == 'ASC';

		var removeArticles = function(title) {
			var words = title.toLowerCase().split(/[\s'’]/);
			return words.length > 1 && articles.indexOf(words[0]) >= 0
				 ? words.splice(1).join(' ')
				 : title;
		};

		var sortWithoutArticle = function(a, b) {
			var first  = ascending ? a : b,
				second = ascending ? b : a;

			first  = removeArticles(first.title);
			second = removeArticles(second.title);
			return first.localeCompare(second);
		};

		files = files.sort(sortWithoutArticle);

		if (updateList)
			files.forEach(entry => list.appendChild(list.querySelector('.movie[data-id="' + entry.index + '"]')));
	}

	var sortFilesByGenericParam = function(param) {
		var ascending = orderSelect.value == 'ASC';

		movies.sort(function(a, b) {
			var first  = ascending ? a : b,
				second = ascending ? b : a;

			if (param == 'resolution' || param == 'rating')
				return first.dataset[param] - second.dataset[param];

			return first.dataset[param].localeCompare(second.dataset[param]);
		}).forEach(movie => list.appendChild(movie));
	}



	/************************************************************
		Filter files
	 ************************************************************/

	var filterFiles = function() {
		list.classList.remove('open-all', 'is-filtered');
		if (searchField.value == '')
			return resetList();

		var normalise  = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
			phrase     = normalise(searchField.value),
			numResults = 0;
		
		list.classList.add('is-filtered');

		movies.forEach(function(movie) {
			var fields       = [].slice.call(movie.querySelectorAll('.movie-body span:last-child')),
				foundAField  = fields.reduce((acc, field) => acc || normalise(field.innerText).indexOf(phrase) > -1, false),
				foundDataset = Object.values(movie.dataset).indexOf(phrase) > -1,
				showThis     = foundAField || foundDataset;

			movie.classList.toggle('hide', !showThis);
			numResults += !showThis ? 0 : 1;
		});

		filterAmount.innerHTML = numResults + ' results';
		filterAmount.classList.add('show');

		if (numResults == 1)
			list.classList.add('open-all');
	}


	/************************************************************
		Get random file
	 ************************************************************/

	var getRandomFile = function() {
		var file = files[Math.floor(Math.random() * files.length)];

		movies.forEach(function(movie) {
			movie.classList.toggle('hide', movie.dataset.id != file.index);
		});

		list.classList.add('open-all', 'is-filtered');
	}


	/************************************************************
		Reset list
	 ************************************************************/

	var resetList = function() {
		movies.forEach(function(movie) {
			movie.classList.remove('hide');
		});

		list.classList.remove('open-all', 'is-filtered');
		searchField.value = '';

		filterAmount.innerHTML = '';
		filterAmount.classList.remove('show');
	}



	/************************************************************
		Key down event
	 ************************************************************/

	var keyDown = function(e) {
		if ((e.keyCode == 70 && e.metaKey) || (e.keyCode == 70 && e.ctrlKey)) {
			e.preventDefault();
			searchField.focus();
		}

		if (document.activeElement == searchField && e.keyCode == 27) {
			searchField.value = '';
			searchField.blur();
			filterFiles();
		}
	}


})();