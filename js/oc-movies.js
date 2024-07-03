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
            if (! (key in this._movieCache)) return null;
            console.log(`found in cache: ${key}`);
            return this._movieCache[key]
        }

        _cacheMovie(movieDetails) {
            let key = this._movieCacheKey(movieDetails.id)
            if (! this._findInCache(key)) this._movieCache[key] = movieDetails;
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
                    for (let i=0; i < genres_fetch.results.length; i++) {
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
            if (! uri) uri = this.baseURL + 'genres/';
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
            if (! genreName) return 0;
            let uri = this.baseURL + 'titles/?genre=' + genreName;
            let movieTitlesPromise = await fetch(uri);
            if (! movieTitlesPromise.ok) {
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
                if (! chunkPromise.ok) {
                    throw new Error(`Failed to fetch movie list from ${uri}`);
                }
                let chunk = await chunkPromise.json()
                if (chunk && chunk.results) {
                    for (let i = 0; i < chunk.results.length; i ++) {
                        this._cacheMovie(chunk.results[i])
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
            if (! details) {
                let uri = this.baseURL + `titles/${movieID}`;
                let detailsPromise = await fetch(uri);
                if (! detailsPromise.ok) {
                    throw Error(`Failed to fetch movie details from ${uri}`)
                }
                if (detailsPromise) details = await detailsPromise.json();
            }
            return details;
        }
    }

    function init() {
        let api = new OCMoviesAPI('http://127.0.0.1:8000/api/v1/');
        api.fetchAllGenres().then((data) => console.log('GENRES', data));
        api.fetchTopMovies(6).then((data) => {
            console.log('TOP MOVIES', data);
            api.fetchMovieDetails(data[0].id).then((movie) => console.log('BEST MOVIE', movie));
        });
        api.fetchTopMovies(6, "Drama").then((data) => console.log('DRAMA - TOP MOVIES', data));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
