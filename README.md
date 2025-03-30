# Tile-o-nator 3000

This project is a simple application for designing random tile patterns, for kitchen backsplashes, bathroom walls, subway stations, whatever.

## Getting Started

This is a node.js application managed with the Node Package Manager (npm).
Be sure to have a [suitable version of `npm`][npm] installed on your system, for example via the [Node Version Manager (nvm)][nvm].

In the project directory, you can run:

```sh
$ npm run dev
```

This runs the application in development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

```sh
$ npm run build
```

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.
The application is ready to be deployed.

## Easy Deployment with Docker

If you have the Docker container virtualization framework installed, then you can simply build the application container and run it using:

```sh
$ npm run docker:build
$ npm run docker:start
```

then open the application in your browser at this URL: [http://localhost:3000/](http://localhost:3000/).

[npm]: https://docs.npmjs.com/about-npm
[nvm]: https://github.com/nvm-sh/nvm?tab=readme-ov-file#node-version-manager---
