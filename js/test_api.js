/**
 * Coding prototype for project #6.
 * 
 * @todo
 * Validate with superviser that the code below meets the expected
 * coding standards for project #6.
 */
(() => {

    /**
     * Fetch the details of a movie and display them in the UI.
     * @param {*} movieURI 
     */
    async function movieDetails(movieURI) {
        const moviePromise = await fetch(movieURI);
        console.log(`fetching ${movieURI}...`)
        if (!moviePromise.ok) {
            throw new Error(`fetch failed ${movieURI}`)
        }
        const details = await moviePromise.json()
        console.log(details)
        node = renderMovieDetails(details)
        displayMovieDetails(node)
    }

    /**
     * Render the movie details using a template.
     * @param {*} movieDetailsData 
     * @returns Element
     */
    function renderMovieDetails(movieDetailsData) {
        let tpl = document.getElementById('movie-detail-tpl')
        let movieNode = tpl.content.cloneNode(true)
        const h2 = movieNode.querySelector("h2")
        h2.textContent = movieDetailsData.title
        const description = movieNode.querySelector(".description")
        description.textContent = movieDetailsData.long_description
        movieNode.querySelector('img').setAttribute('src', movieDetailsData.image_url)
        return movieNode
    }

    /**
     * Displays the movie details in the UI.
     * @param {*} detailsNode 
     */
    function displayMovieDetails(detailsNode) {
        rootNode = document.getElementById('API-call-result')
        rootNode.replaceChildren(detailsNode)
    }

    /**
     * Init: bind event handlers.
     */
    function init() {
        var all_btns = document.getElementsByClassName('api-btn');
        for (i = 0; i < all_btns.length; i++) {
            all_btns[i].addEventListener('click', (evt) => {
                console.log('Cicked on a movie link')
                evt.preventDefault()
                uri = evt.currentTarget.getAttribute("href")
                movieDetails(uri)
            })
        }
    }

    document.addEventListener('DOMContentLoaded', init)
})();
