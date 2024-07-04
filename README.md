# Purpose

Project for the OpenClassrooms Python course.

This project yields the front-end of a single page app for a movie-club. The app retrieves its data from a movie-database API: OC-Movies-API-EN-FR.

see https://github.com/OpenClassrooms-Student-Center/OCMovies-API-EN-FR


# Testing instructions

The Frontend is accessible from a single HTML file: `htm/index.html`.

In order to test the UI from a local filesystem, please follow the instructions below.

## Requirements

**1. A local Server**

While opening the local HTML file ***may work*** with a few browsers (for ex. Firefox), this will ***certainly fail*** with others (for ex. Google Chrome).
You will therefore need some kind of local server to serve the frontend files.

Several light-weight solutions exist. This readme will provide instructions using a **python local server**. (see below)

**2. The OC-Movies API**

Testing the fronted requires the API to be accessible from a local server.

You will need to install the API, and then run a local server to handle the requests to the API.

Full instructions are provided on the [API's GitHub](https://github.com/OpenClassrooms-Student-Center/OCMovies-API-EN-FR).

## 1. Installing and serving the API

Clone the API in a local folder:
```
    mkdir ocmovies-api
    git clone https://github.com/OpenClassrooms-Student-Center/OCMovies-API-EN-FR ocmovies-api
```

Setup the virtual environment and the API:
```
    cd ocmovies-api
    pyhton -m venv env
    source env/bin/activate
    pip install -r requirements.txt
    python manage.py create_db
```

Now start the server on port 8000:
```
    python manage.py runserver
```
_(You can stop the server any time by hitting `<Ctrl>+C`.)_

## 2. Installing and serving the Front-end

Now install the front end in a different folder:

```
    mkdir ocmovies-frontend
    git clone https://github.com/christian-debray/oc-movies-frontend.git ocmovies-frontend
```

From the front-end folder, start another server. In our example, we'll use Python's built-in server to do so. Port 8000 is already used by the API server, so we'll use another port (for ex. 7800).

```
    cd ocmovies-frontend
    python -m http.server 7800
```
_(You can stop the server any time by hitting `<Ctrl>+C`.)_

Now you can test the API's front-end from your favorite browser:

http://127.0.0.1:7800/html/index.html
