(() => {
    /**
     * Interface to the OC Movies API.
     * 
     * Queries the API and returns the results as javascript objects taht can be rendered by templates.
     * The methods are all asynchronous, so you must rely on the Promise API to use the results.
     */
    class OCMoviesAPI {
        constructor(baseURL) {
            this.baseURL = baseURL;
            this._movieCache = {};
        }

        _movieCacheKey(movieID) {
            return `mov_${movieID}`
        }

        _findInCache(movieID) {
            let key = this._movieCacheKey(movieID);
            if (!(key in this._movieCache)) return null;
            return this._movieCache[key]
        }

        _cacheMovie(movieDetails) {
            let key = this._movieCacheKey(movieDetails.id)
            if (!this._findInCache(key)) this._movieCache[key] = movieDetails;
        }

        /**
         * List all available movie genres.
         * 
         * @returns a promise yielding the list of genre names with available movies.
         */
        async fetchAllGenres() {
            let genresList = Array();
            let next_uri = this.baseURL + 'genres/';
            let genres_fetch;
            while (next_uri) {
                genres_fetch = await this._fetchGenresByPage(next_uri);
                next_uri = genres_fetch.next
                if (genres_fetch.results && genres_fetch.results.length) {
                    for (let i = 0; i < genres_fetch.results.length; i++) {
                        genresList.push(genres_fetch.results[i].name)
                    }
                }
            }
            return genresList
        }

        /**
         * Fetch one page listing the genres.
         * 
         * @param {string} uri (optional) full URI of the endpoint and querystring to query the genres list.
         * @returns 
         */
        async _fetchGenresByPage(uri = null) {
            if (!uri) uri = this.baseURL + 'genres/';
            let genrePromise = await fetch(uri);
            if (!genrePromise.ok)
                throw Error(`Failed to fetch genres list from ${uri}`);
            let genresList = await genrePromise.json();
            return genresList
        }

        /** 
         * Lookup a genre in the API, and returns the number of movies
         * available for this genre.
         * 
         * @param {string} genreName a string with the full name of the genre.
         * @returns a promise with the number of available movies as an integer.
         */
        async countMoviesInGenre(genreName) {
            if (!genreName) return 0;
            let uri = this.baseURL + 'titles/?genre=' + genreName;
            let movieTitlesPromise = await fetch(uri);
            if (!movieTitlesPromise.ok) {
                throw Error(`Failed to fetch movie titles from ${uri}`);
            }
            let moviesList = await movieTitlesPromise.json()
            if (moviesList && moviesList.count) return moviesList.count;
            return 0;
        }

        /**
         * Fetches a list of top movies.
         * 
         * If the optional genre name parameter is provied, fetches the top movies found in the genre.
         * @param {number} limit
         * @param {string} genreName if null, ignore movie genre when looking the score
         */
        async fetchTopMovies(limit = 6, genreName = null) {
            let uri = this.baseURL + "titles/?sort_by=-imdb_score";
            if (genreName) uri += `&genre=${genreName}`;
            let movieList = new Array();
            let attempts = 10;
            while (uri && movieList.length <= limit && attempts > 0) {
                attempts -= 1
                let chunkPromise = await fetch(uri)
                if (!chunkPromise.ok) {
                    throw new Error(`Failed to fetch movie list from ${uri}`);
                }
                let chunk = await chunkPromise.json()
                if (chunk && chunk.results) {
                    for (let i = 0; i < chunk.results.length; i++) {
                        if (movieList.length + 1 <= limit) movieList.push(chunk.results[i])
                    }
                    uri = chunk.next;
                } else {
                    uri = null;
                }
            }
            return movieList;
        }

        /**
         * Queries the API for the full details of a movie.
         * @param {Number} movieID 
         */
        async fetchMovieDetails(movieID) {
            let details = this._findInCache(movieID);
            if (!details) {
                let uri = this.baseURL + `titles/${movieID}`;
                let detailsPromise = await fetch(uri);
                if (!detailsPromise.ok) {
                    throw Error(`Failed to fetch movie details from ${uri}`)
                }
                if (detailsPromise) details = await detailsPromise.json();
                this._cacheMovie(details);
            }
            return details;
        }
    }

    /**
     * A facade object wrapping the raw movie data received form the API.
     */
    class MovieDataFacade {
        constructor(movieJSON) {
            this._data = movieJSON;
            this.title = this._getAttr('title', '?');
            this.image_url = this._getAttr('image_url', null);
            // this.image_url = "../img/movie_cover.png";
            this.description = this._getAttr('description', '');
            this.id = this._getAttr('id', null);
            this.year = this._getAttr('year', '-');
            this.genres = this._getAttr('genres', []);
            this.rated = this._getAttr('rated', '-');
            this.long_description = this._getAttr('long_description', '-');
            this.countries = this._getAttr('countries', []);
            this.imdb_score = this._getAttr('imdb_score', '-');
            this.duration = this._getAttr('duration', '-');
            this.directors = this._getAttr('directors', []);
            this.actors = this._getAttr('actors', []);
        }

        _getAttr(attr, repl) {
            if (attr in this._data) {
                return this._data[attr];
            } else {
                return repl
            }
        }
    }

    function renderMovieOverview(rawMovieData, slotSelector) {
        let movieData = new MovieDataFacade(rawMovieData);
        let tpl = document.getElementById('movie-overview-tpl').content.cloneNode(true);
        tpl.querySelector("img.movie-cover-thumbnail").setAttribute("alt", `Cover: ${movieData.title}`);
        tpl.querySelector("img.movie-cover-thumbnail").setAttribute("src", movieData.image_url);
        tpl.querySelector("slot[name=title]").textContent = movieData.title;
        tpl.querySelector("slot[name=description]").textContent = movieData.description;
        tpl.querySelector(".actions .btn").dataset.movieId = movieData.id;
        let slot = document.querySelector(slotSelector);
        slot.replaceChildren(tpl)
    }

    function renderMovieCard(rawMovieData) {
        let movieData = new MovieDataFacade(rawMovieData);
        let cardTpl = document.getElementById('movie-card-tpl').content;
        let card = cardTpl.cloneNode(true);
        card.querySelector('.movie-gallery-thumbnail').style.backgroundImage = `url('${movieData.image_url}')`;
        card.querySelector("slot[name=title]").textContent = movieData.title;
        card.querySelector(".btn").dataset.movieId = movieData.id;
        return card;
    }

    function renderMovieList(movieListData, slotSelector) {
        let listNode = document.getElementById('movie-list-tpl').content.cloneNode(true);
        let cardsContainer = listNode.querySelector('div.thumbnails-list');
        for (let i = 0; i < movieListData.length; i++) {
            let card = renderMovieCard(movieListData[i]);
            cardsContainer.appendChild(card.children[0]);
        }
        slot = document.querySelector(slotSelector);
        slot.replaceChildren(listNode);
    }

    function renderCategory(catName, movieListData, categoryRootSelector) {
        let categoryContainer = document.querySelector(categoryRootSelector);
        categoryContainer.querySelector("slot[name=category-name]").textContent = catName;
        renderMovieList(movieListData, `${categoryRootSelector} slot[name=movie-list]`)
    }

    function renderCategorySelector(categoryDataList, slotSelector, title = null) {
        let selectorNode = document.getElementById('category-selector').content.cloneNode(true);
        if (title) selectorNode.querySelector("slot[name=selector-title]").textContent = title;
        let itemsContainer = selectorNode.querySelector("[slot=selector-items]");
        let itemTpl = document.getElementById("category-selector-item");
        for (i = 0; i < categoryDataList.length; i++) {
            let itemNode = itemTpl.content.cloneNode(true).querySelector('li');
            itemNode.dataset.genreName = categoryDataList[i];
            itemNode.textContent = categoryDataList[i];
            itemsContainer.appendChild(itemNode);
        }
        document.querySelector(slotSelector).replaceChildren(selectorNode);
    }

    function displayMovieDetailsModal(movieJSONData) {
        hide_modal();
        let movieData = new MovieDataFacade(movieJSONData);
        movieDetailsNode = document.getElementById('modal-movie-details-tpl').content.cloneNode(true);
        movieDetailsNode.querySelector("[slot='movie-title']").textContent = movieData.title;
        movieDetailsNode.querySelector("[slot='year']").textContent = movieData.year;
        movieDetailsNode.querySelector("[slot='movie-genre-list']").textContent = movieData.genres.join(', ');
        movieDetailsNode.querySelector("slot[name='rated']").textContent = movieData.rated;
        movieDetailsNode.querySelector("slot[name='duration']").textContent = movieData.duration;
        movieDetailsNode.querySelector("slot[name='countries']").textContent = movieData.countries.join(' / ');
        movieDetailsNode.querySelector("slot[name='imdb_score']").textContent = movieData.imdb_score;
        movieDetailsNode.querySelector("slot[name='directors']").textContent = movieData.directors.join(', ');
        movieDetailsNode.querySelector(".movie-cover").setAttribute('alt', `Cover: ${movieData.title}`);
        movieDetailsNode.querySelector(".movie-cover").setAttribute('src', movieData.image_url);
        movieDetailsNode.querySelector("slot[name='long_description']").textContent = movieData.long_description;
        movieDetailsNode.querySelector("slot[name='actors']").textContent = movieData.actors.join(', ');
        modalRootNode = document.querySelector('#movie-details-window .modal-window-inner');
        modalRootNode.replaceChildren(movieDetailsNode);
        show_modal();
    }

    /**
     * Small controller object for category selector dropdown lists.
     * 
     * Accepts a single handler to call when selected item changed.
     */
    class CategorySelectorDropdown {
        constructor(dataList, view) {
            this.options = dataList || new Array();
            this.selectedIdx = -1;
            this.view = view;
            this.onSelectionChanged = null
        }

        optionIndex(optName) {
            return this.options.findIndex((n) => (n === optName));
        }

        selectOption(nameOrIndex) {
            let idx = 0;
            idx = Number.isInteger(Number(nameOrIndex)) ? Number(nameOrIndex) : this.optionIndex(nameOrIndex);
            if (idx >= 0 && idx !== self.selectedIdx) {
                this.selectedIdx = idx;
                this.updateView();
                if (this.onSelectionChanged) {
                    this.onSelectionChanged(this.options[this.selectedIdx])
                }
            }
        }

        updateView() {
            if (!this.view) return;
            let currSel = this.view.querySelector('.dropdown-item[data-selected="1"]');
            if (currSel) currSel.dataset.selected = "0";
            if (this.selectedIdx >= 0) {
                let siblingIdx = this.selectedIdx + 1;
                let item = this.view.querySelector(`.dropdown-item:nth-child(${siblingIdx})`);
                if (item) item.dataset.selected = "1";
            }
        }
    }

    function show_modal() {
        let modal = document.getElementById('movie-details-window')
        if (!modal.classList.contains("displayed")) {
            modal.classList.add("displayed")
        }
    }

    function hide_modal() {
        let modal = document.getElementById('movie-details-window')
        if (modal.classList.contains("displayed")) {
            modal.classList.remove("displayed")
        }
    }

    function init() {
        let api = new OCMoviesAPI('http://127.0.0.1:8000/api/v1/');
        // top movies
        api.fetchTopMovies(6).then((data) => {
            renderMovieList(data, "#top-movies div.movie-list-slot");
            api.fetchMovieDetails(data[0].id).then((movie) => {
                renderMovieOverview(movie, '#best-movie-overview slot[name=movie-overview]');
            });
        });
        // category 1
        api.fetchTopMovies(6, "Drama").then((data) => {
            renderCategory("Drama", data, "#category-1");
        });
        // category 2
        api.fetchTopMovies(6, "Thriller").then((data) => {
            renderCategory("Thriller", data, "#category-2");
        });
        // custom category
        api.fetchAllGenres().then((data) => {
            renderCategorySelector(data, "#custom-category slot[name=category-selector]");
            let dropdown = document.querySelector("#custom-category .dropdown");
            selector = new CategorySelectorDropdown(data, dropdown);
            // bindings: load category contents when the user selects a new category.
            selector.onSelectionChanged = ((api) => (catName) => {
                api.fetchTopMovies(6, catName).then((data) => renderMovieList(data, "#custom-category slot[name='movie-list']"))
            })(api);
            // bind click on an option to selector.selectOption():
            dropdown.addEventListener("click", ((selector) =>
                (evt) => {
                    item = evt.target;
                    if (item.classList && item.classList.contains('dropdown-item')) {
                        evt.stopPropagation();
                        selector.selectOption(item.dataset.genreName);
                    }
                })(selector)
            );
            selector.selectOption(0);
        });
        // bind clicks on buttons
        document.addEventListener("click", ((api) => {
            return (evt) => {
                tgt = evt.target;
                if (tgt.classList && tgt.classList.contains('btn') && tgt.hasAttribute('data-movie-id')) {
                    // view movie details button
                    api.fetchMovieDetails(tgt.dataset.movieId).then((movieData) => { displayMovieDetailsModal(movieData) });
                    evt.stopPropagation();
                }
                // dismiss modal window button
                if (tgt.classList && tgt.classList.contains('close')) {
                    hide_modal();
                }
                // see more button
                if (tgt.classList && tgt.classList.contains('more')) {
                    const card_list = tgt.closest('.movie-list');
                    if (card_list && card_list.classList && !card_list.classList.contains("full")) {
                        card_list.classList.add("full")
                    }
                    evt.stopPropagation();
                }
                // see less button
                if (tgt.classList && tgt.classList.contains('less')) {
                    const card_list = tgt.closest('.movie-list');
                    if (card_list && card_list.classList && card_list.classList.contains("full")) {
                        card_list.classList.remove("full")
                    }
                    evt.stopPropagation();
                }
            }
        })(api));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
