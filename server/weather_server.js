const http = require('http');
const https = require('https');
const fs = require('fs');
require("isomorphic-fetch");
const { Client } = require('pg');

var pg_client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'weatherdb',
    password: 'pass',
    port: 5432,
});
pg_client.connect();

exports.replacePgClient = function(newPg) {
	pg_client = newPg;
}

const hostname = '127.0.0.1';
const port = 3000;

initializeDb();

var keyLoc = '';

searchForKeyLoc();

const options = {
	key: fs.readFileSync(keyLoc + 'key.pem'),
	cert: fs.readFileSync(keyLoc + 'cert.pem'),
};

const server = https.createServer(options, (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	if (req.method === 'OPTIONS') {
		res.statusCode = 200;
		res.end();
	}
	const baseUrl = req.url.split('?')[0];
	const queryUrl = '?' + req.url.split('?')[1];
	const urlSearchParams = new URLSearchParams(queryUrl);
	let cityName = '';
	console.log(req.method);
	if(req.method === 'POST' || req.method === 'DELETE') {
		req.on('data', function (data) {
            cityName = data;
			if(baseUrl === '/weather/favorites') {
				switch(req.method) {
					case 'POST':
						addFavCity(cityName, res);
						return;
					case 'DELETE':
						deleteFavCity(cityName, res);
						return;
				}
			}
			send404(res);
		});
	} else if(req.method === 'GET') {
		switch(baseUrl) {
			case '/weather/city':
				sendWeather(urlSearchParams.get('q'), res);
				return;
			case '/weather/coordinates':
				sendLocation(urlSearchParams.get('lat'), urlSearchParams.get('lng'), res);
				return;
			case '/weather/favorites':
				sendFavCities(res);
				return;
		}
		send404(res);
	} else {
		send404(res);
	}
}).listen(port, hostname, () => {
	console.log(`Server running at https://${hostname}:${port}/`);
	exports.server = server;
});

function send404(res) {
	res.statusCode = 404;
	res.end(`{"error": "${http.STATUS_CODES[404]}"}`);
}

function sendWeather(cityName, res) {
	fetch("https://api.openweathermap.org/data/2.5/weather?q=" + cityName + "&appid=05084c9b7c23be334330469ae0d59085", {mode: 'no-cors'}).then(response => response.json()).then(json => {
			res.statusCode = 200;
			res.end(JSON.stringify(json));
		}
	).catch(function(error) {
		res.statusCode = 404;
		console.log(error);
		res.end(`{"error": "${http.STATUS_CODES[404]}"}`);
	});
}

function sendLocation(lat, lng, res) {
	fetch("http://api.geonames.org/findNearbyPlaceName?cities=cities5000&lat=" + lat + "&lng=" + lng + "&username=habsburgchin", {mode: 'no-cors'}).then(response => response.text())
	.then(str => {
			res.statusCode = 200;
			res.end(str);
		}
	).catch(function(error) {
		res.statusCode = 500;
		console.log(error);
		res.end(`{"error": "${http.STATUS_CODES[404]}"}`);
	});
}

function initializeDb() {
	const create_query = `
		CREATE TABLE IF NOT EXISTS favcities (
			name varchar primary key
		);
		`;
	pg_client.query(create_query, (err,result) => {
		if (err) {
			console.error(err);
			return;
		}
		console.log("Table creation attempted");
	});
}

function addFavCity(cityName, res) {
	const insert_query = `
		INSERT INTO favcities VALUES
		('` + cityName + `');
		`;
	pg_client.query(insert_query).then(result => {
		console.log("City of " + cityName + " inserted");
		console.log(result);
		res.statusCode = 200;
		res.end();
		return;
	}).catch(err => {
		res.statusCode = 500;
		console.error(err);
		res.end(err);
		return;
	});
}

function deleteFavCity(cityName, res) {
	const delete_query = `
		DELETE FROM favcities
		WHERE name = '` + cityName + `';
		`;
	pg_client.query(delete_query).then(result => {
		console.log("City of " + cityName + " deleted");
		res.statusCode = 200;
		res.end();
		return;
	}).catch(err => {
		res.statusCode = 500;
		console.error(err);
		res.end(err);
		return;
	});
}

function sendFavCities(res) {
	const select_query = `
		SELECT * FROM favcities;
		`;
	pg_client.query(select_query).then(result => {
		console.log("Cities retrieved");
		let favCities = [];
		for(let row of result.rows) {
			favCities.push(row['name']);
		}
		res.statusCode = 200;
		res.end(JSON.stringify(favCities));
		return;
	}).catch(err => {
		console.log(err);
		res.statusCode = 500;
		console.error(err);
		res.end(err);
		return;
	});
}

function searchForKeyLoc() {
	var loc = process.cwd();
	var dir = loc.substring(loc.lastIndexOf('\\'), loc.length);
	if(dir != "\\server") {
		keyLoc = "server/"
	}
}