const http = require('http');
const setup = require("./setup.js");
const mocha = require("mocha");
const expect = require("chai").expect;
const fetchMock = require('fetch-mock');
const weather_server = require("../server/weather_server.js");
const sinon = require('sinon');
const request = require('supertest');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pgClientStub = {
  connect: sinon.stub().returnsThis()
};

weather_server.replacePgClient(pgClientStub);

describe('Backend Test', function() {
	describe('GET /weather/city', function() {
		describe('With a correct response', function() {
			it('should return the specified response, formatted as in the openweathermap API', function(done) {
				fetchMock.get("https://api.openweathermap.org/data/2.5/weather?q=Omsk&appid=05084c9b7c23be334330469ae0d59085", mockResponseFromString(200, 
				'{"coord":{"lon":73.4,"lat":55},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":259.15,"feels_like":253.58,"temp_min":259.15,"temp_max":259.15,"pressure":1044,"humidity":77},"visibility":10000,"wind":{"speed":3,"deg":10},"clouds":{"all":0},"dt":1606663636,"sys":{"type":1,"id":8960,"country":"RU","sunrise":1606619075,"sunset":1606646720},"timezone":21600,"id":1496153,"name":"Omsk","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				request('https://127.0.0.1:3000/').get("weather/city?q=Omsk").expect(200, '{"coord":{"lon":73.4,"lat":55},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":259.15,"feels_like":253.58,"temp_min":259.15,"temp_max":259.15,"pressure":1044,"humidity":77},"visibility":10000,"wind":{"speed":3,"deg":10},"clouds":{"all":0},"dt":1606663636,"sys":{"type":1,"id":8960,"country":"RU","sunrise":1606619075,"sunset":1606646720},"timezone":21600,"id":1496153,"name":"Omsk","cod":200}').end(function(err, res) {
					if (err) return done(err);
					done();
				});
			});
		});
		describe('With an error response', function() {
			it('should return an error: city not found', function(done) {
				fetchMock.get("https://api.openweathermap.org/data/2.5/weather?q=Heaven&appid=05084c9b7c23be334330469ae0d59085", mockResponseFromString(404, 
				'{"cod":"404","message":"city not found"}'), { overwriteRoutes: false, repeat: 1 });
				request('https://127.0.0.1:3000/').get("weather/city?q=Heaven").expect(200, '{"cod":"404","message":"city not found"}').end(function(err, res) {
					if (err) return done(err); else done();
				});
			});
		});
	});
	
	describe('GET /weather/coordinates', function() {
		describe('With a correct response', function() {
			it('should return the specified response, formatted as in the geonames API', function(done) {
				fetchMock.get("http://api.geonames.org/findNearbyPlaceName?cities=cities5000&lat=55&lng=73.4&username=habsburgchin", mockResponseFromString(200, 
				'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\
				<geonames>\
					<geoname>\
						<toponymName>Omsk</toponymName>\
						<name>Omsk</name>\
						<lat>54.99244</lat>\
						<lng>73.36859</lng>\
						<geonameId>1496153</geonameId>\
						<countryCode>RU</countryCode>\
						<countryName>Russia</countryName>\
						<fcl>P</fcl>\
						<fcode>PPLA</fcode>\
						<distance>3.98886</distance>\
					</geoname>\
				</geonames>'), { overwriteRoutes: false, repeat: 1 });
				request('https://127.0.0.1:3000/').get("weather/coordinates?lat=55&lng=73.4").expect(200, '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\
				<geonames>\
					<geoname>\
						<toponymName>Omsk</toponymName>\
						<name>Omsk</name>\
						<lat>54.99244</lat>\
						<lng>73.36859</lng>\
						<geonameId>1496153</geonameId>\
						<countryCode>RU</countryCode>\
						<countryName>Russia</countryName>\
						<fcl>P</fcl>\
						<fcode>PPLA</fcode>\
						<distance>3.98886</distance>\
					</geoname>\
				</geonames>').end(function(err, res) {
					if (err) return done(err); else done();
				});
			});
		});
		describe('With an error response', function() {
			it('should return an error: city not found', function(done) {
				fetchMock.get("http://api.geonames.org/findNearbyPlaceName?cities=cities5000&lat=55&lng=73.4&username=habsburgchin", mockResponseFromString(404, 
				'error'), { overwriteRoutes: false, repeat: 1 });
				request('https://127.0.0.1:3000/').get("weather/coordinates?lat=55&lng=73.4").expect(200, 'error').end(function(err, res) {
					if (err) return done(err); else done();
				});
			});
		});
	});
	
	describe('GET /weather/favorites', function() {
		it('should return a list of 3 cities: Moscow, Warsaw, Amsterdam', function(done) {
			pgClientStub.query = sinon.stub().withArgs(`
				SELECT * FROM favcities;
				`)
			.resolves({rows: [{name: "Moscow"}, {name: "Warsaw"}, {name: "Amsterdam"}]})
			request('https://127.0.0.1:3000/').get("weather/favorites").expect(200, '["Moscow","Warsaw","Amsterdam"]').end(function(err, res) {
				if (err) return done(err); else done();
			});
		});
	});
	
	describe('POST /weather/favorites', function() {
		it('should return code 200', function(done) {
			pgClientStub.query = sinon.stub().withArgs(`
				INSERT INTO favcities VALUES
				('London');
				`)
			.resolves({rows: []})
			request('https://127.0.0.1:3000/').post("weather/favorites").send("London").expect(200).end(function(err, res) {
				if (err) return done(err); else done();
			});
		});
	});
	
	describe('DELETE /weather/favorites', function() {
		it('should return code 200', function(done) {
			pgClientStub.query = sinon.stub().withArgs(`
				DELETE FROM favcities
				WHERE name = 'London';
				`)
			.resolves({rows: []})
			request('https://127.0.0.1:3000/').delete("weather/favorites").send("London").expect(200).end(function(err, res) {
				if (err) return done(err); else done();
			});
		});
	});
});

function mockResponse(stat, body = {}) {
	return new Response(JSON.stringify(body), {
		status: stat
	});
}

function mockResponseFromString(stat, body = '') {
	return new Response(body, {
		status: stat
	});
}