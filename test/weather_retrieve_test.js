const setup = require("./setup.js");
const mocha = require("mocha");
const expect = require("chai").expect;
const sinon = require("sinon");
const fetchMock = require('fetch-mock');
const geolocate = require('mock-geolocation');
const weather_retrieve = require("../weather_retrieve.js");

describe('Frontend Test', function() {
	describe('#loadFavCities()', function() {
		describe('With a correct response', function() {
			it('should start with the favCitiesRetrieved flag set to False', function() {
				expect(weather_retrieve.favCitiesRetrieved).to.equal(false);
			});
			it('should set favorite cities to Moscow, Warsaw, Amsterdam', function(done) {
				fetchMock.get("https://localhost:3000/weather/favorites", mockResponse(200, ['Moscow', 'Warsaw', 'Amsterdam']), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.loadFavCities(function() {
					expect(weather_retrieve.favCityNames.length).to.equal(3);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					done();
				});
			});
			it('should set the favCitiesRetrieved flag to True', function() {
				expect(weather_retrieve.favCitiesRetrieved).to.equal(true);
			});
		});
		describe('With an error response', function() {
			it('should set favorite cities to an empty array', function(done) {
				fetchMock.get("https://localhost:3000/weather/favorites", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.loadFavCities(function() {
					expect(weather_retrieve.favCityNames.length).to.equal(0);
					done();
				});
			});
			it('should set the favCitiesRetrieved flag to True', function() {
				expect(weather_retrieve.favCitiesRetrieved).to.equal(true);
			});
		});
	});
	
	geolocate.use();
	
	describe('#getLocation()', function() {
		describe('With geoloc turned on and a correct response from the reverse geolocation API', function() {
			it('should start with the local city set to Saint Petersburg and geolocFinished to False', function() {
				expect(weather_retrieve.localCity).to.equal('Saint Petersburg');
				expect(weather_retrieve.geolocFinished).to.equal(false);
			});
			it('should set the local city to Omsk', function(done) {
				fetchMock.get("https://localhost:3000/weather/coordinates?lat=55&lng=73.4", mockResponseFromString(200, 
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
				weather_retrieve.getLocation(function() {
					expect(weather_retrieve.localCity).to.equal('Omsk');
					done();
				});
				geolocate.send({latitude: 55, longitude: 73.4});
			});
			it('should set the geolocFinished flag to True', function() {
				expect(weather_retrieve.geolocFinished).to.equal(true);
			});
		});
		describe('With geoloc turned on and an error response from the reverse geolocation API', function() {
			it('should not change the local city from Saint Petersburg', function(done) {
				fetchMock.get("https://localhost:3000/weather/coordinates?lat=55&lng=73.4", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setLocalCity('Saint Petersburg');
				weather_retrieve.getLocation(function() {
					expect(weather_retrieve.localCity).to.equal('Saint Petersburg');
					done();
				});
				geolocate.send({latitude: 55, longitude: 73.4});
			});
			it('should set the geolocFinished flag to False', function() {
				expect(weather_retrieve.geolocFinished).to.equal(false);
			});
		});
		describe('With geoloc turned off', function() {
			it('should not change the local city from Saint Petersburg', function(done) {
				weather_retrieve.setLocalCity('Saint Petersburg');
				weather_retrieve.getLocation(function() {
					expect(weather_retrieve.localCity).to.equal('Saint Petersburg');
					done();
				});
				geolocate.sendError({code: 1, message: "DENIED"});
			});
			it('should set the geolocFinished flag to True', function() {
				expect(weather_retrieve.geolocFinished).to.equal(true);
			});
		});
	});
	
	
	describe('#getWeather()', function() {
		describe('With a correct response', function() {
			it('should pass the correct JSON to the main callback function', function(done) {
				weather_retrieve.setLocalCity('Omsk');
				jsonString = '{"coord":{"lon":73.4,"lat":55},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":259.15,"feels_like":253.58,"temp_min":259.15,"temp_max":259.15,"pressure":1044,"humidity":77},"visibility":10000,"wind":{"speed":3,"deg":10},"clouds":{"all":0},"dt":1606663636,"sys":{"type":1,"id":8960,"country":"RU","sunrise":1606619075,"sunset":1606646720},"timezone":21600,"id":1496153,"name":"Omsk","cod":200}';
				fetchMock.get("https://localhost:3000/weather/city?q=Omsk", mockResponseFromString(200, 
				jsonString), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.getWeather('Omsk', function(cityName, weatherJson) {
					expect(cityName).to.equal('Omsk');
					expect(jsonString).to.equal(JSON.stringify(weatherJson));
					done();
				});
			});
		});
		describe('With an error response', function() {
			it('should not call the main callback function', function(done) {
				weather_retrieve.setLocalCity("Omsk");
				fetchMock.get("https://localhost:3000/weather/city?q=Omsk", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.getWeather('Omsk', function(cityName, weatherJson) {
					throw new Error("The main callback should not be called here");
				}, function() {
					done();
				});
			});
		});
	});
	
	
	describe('#loadLocalBox()', function() {
		describe('With a correct response', function() {
			it('should call getWeather() and printLocalWeather() once each', function(done) {
				weather_retrieve.setLocalCity('Omsk');
				fetchMock.get("https://localhost:3000/weather/city?q=Omsk", mockResponseFromString(200, 
				'{"coord":{"lon":73.4,"lat":55},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":259.15,"feels_like":253.58,"temp_min":259.15,"temp_max":259.15,"pressure":1044,"humidity":77},"visibility":10000,"wind":{"speed":3,"deg":10},"clouds":{"all":0},"dt":1606663636,"sys":{"type":1,"id":8960,"country":"RU","sunrise":1606619075,"sunset":1606646720},"timezone":21600,"id":1496153,"name":"Omsk","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printLocalWeatherSpy();
				weather_retrieve.loadLocalBox(function() {
					expect(weather_retrieve.localCity).to.equal('Omsk');
					expect(getWeatherSpy.callCount).to.equal(1);
					expect(printWeatherSpy.callCount).to.equal(1);
					done();
				});
			});
		});
		describe('With an error response', function() {
			it('should call getWeather() but not printLocalWeather()', function(done) {
				weather_retrieve.setLocalCity("Omsk");
				fetchMock.get("https://localhost:3000/weather/city?q=Omsk", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printLocalWeatherSpy();
				weather_retrieve.loadLocalBox(function() {
					expect(weather_retrieve.localCity).to.equal('Omsk');
					expect(getWeatherSpy.callCount).to.equal(1);
					expect(printWeatherSpy.callCount).to.equal(0);
					done();
				});
				
			});
		});
	});
	
	
	describe('#printLocalWeather()', function() {
		describe('With a correct response', function() {
			it('should display the city of Omsk with specific weather values in the local box', function(done) {
				weather_retrieve.setLocalCity("Omsk");
				weatherJson = JSON.parse('{"coord":{"lon":73.4,"lat":55},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":259.15,"feels_like":253.58,"temp_min":259.15,"temp_max":259.15,"pressure":1044,"humidity":77},"visibility":10000,"wind":{"speed":3,"deg":10},"clouds":{"all":0},"dt":1606663636,"sys":{"type":1,"id":8960,"country":"RU","sunrise":1606619075,"sunset":1606646720},"timezone":21600,"id":1496153,"name":"Omsk","cod":200}');
				weather_retrieve.printLocalWeather(weatherJson, function() {
					expect(weather_retrieve.localCity).to.equal('Omsk');
					
					localBoxWeatherBox = document.getElementsByClassName("local_box")[0].getElementsByClassName("weather_box")[0];
					expect(localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[0].getAttribute("src")).to.equal('https://openweathermap.org/img/wn/01n@2x.png');
					expect(localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[1].textContent).to.equal('-14°C');
					
					localBoxWeatherDescription = localBoxWeatherBox.getElementsByClassName("weather_description")[0];
					expect(localBoxWeatherDescription.children[0].children[1].textContent).to.equal('Light breeze, 3 m/s, North');
					expect(localBoxWeatherDescription.children[1].children[1].textContent).to.equal('Clear Skies');
					expect(localBoxWeatherDescription.children[2].children[1].textContent).to.equal('1044 hpa');
					expect(localBoxWeatherDescription.children[3].children[1].textContent).to.equal('77 %');
					expect(localBoxWeatherDescription.children[4].children[1].textContent).to.equal('[55, 73.4]');
					done();
				});
			});
		});
		describe('With an error response', function() {
			it('should not change values in the local box, but should put an error message on the loading screen', function(done) {
				weather_retrieve.setLocalCity("Omsk");
				weatherJson = {"error": "500"};
				weather_retrieve.printLocalWeather(weatherJson, function() {
					expect(weather_retrieve.localCity).to.equal('Omsk');
					
					localBoxWeatherBox = document.getElementsByClassName("local_box")[0].getElementsByClassName("weather_box")[0];
					expect(localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[0].getAttribute("src")).to.equal('https://openweathermap.org/img/wn/01n@2x.png');
					expect(localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[1].textContent).to.equal('-14°C');
					
					localBoxWeatherDescription = localBoxWeatherBox.getElementsByClassName("weather_description")[0];
					expect(localBoxWeatherDescription.children[0].children[1].textContent).to.equal('Light breeze, 3 m/s, North');
					expect(localBoxWeatherDescription.children[1].children[1].textContent).to.equal('Clear Skies');
					expect(localBoxWeatherDescription.children[2].children[1].textContent).to.equal('1044 hpa');
					expect(localBoxWeatherDescription.children[3].children[1].textContent).to.equal('77 %');
					expect(localBoxWeatherDescription.children[4].children[1].textContent).to.equal('[55, 73.4]');
					done();
					
					expect(document.getElementsByClassName("local_box")[0].getElementsByClassName("load_screen")[0].children[0].textContent).to.equal("Город не найден.");
				});
				
			});
		});
	});
	
	
	describe('#initializeFavoriteCityBoxes()', function() {
		it('should create 3 favorite city boxes according to the template, with the names set to Moscow, Warsaw, Amsterdam', function(done) {
			weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
			weather_retrieve.initializeFavoriteCityBoxes(function() {
				favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
				expect(favoriteBoxes.length).to.equal(3);
				
				for(var i = 0; i < favoriteBoxes.length; i++) {
					selectedWeatherBox = favoriteBoxes[i];
					expect(selectedWeatherBox.getElementsByClassName("city_title").length).to.equal(1);
					expect(selectedWeatherBox.getElementsByClassName("load_screen").length).to.equal(1);
					expect(selectedWeatherBox.getElementsByClassName("weather_description").length).to.equal(1);
					
					expect(selectedWeatherBox.getElementsByClassName("city_title")[0].children.length).to.equal(4);
					expect(selectedWeatherBox.getElementsByClassName("load_screen")[0].children.length).to.equal(2);
					expect(selectedWeatherBox.getElementsByClassName("weather_description")[0].children.length).to.equal(5);
				}
				
				expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Moscow');
				expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Warsaw');
				expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Amsterdam');
				done();
			});
		});
	});
	
	
	describe('#printFavoriteCityBoxes()', function() {
		describe('With a correct response', function() {
			it('should call getWeather() and printFavoriteWeather() 3 times each', function(done) {
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
				fetchMock.get("https://localhost:3000/weather/city?q=Moscow", mockResponseFromString(200, 
				'{"coord":{"lon":37.62,"lat":55.75},"weather":[{"id":600,"main":"Snow","description":"light snow","icon":"13n"}],"base":"stations","main":{"temp":274.23,"feels_like":269.48,"temp_min":274.15,"temp_max":274.26,"pressure":1028,"humidity":94},"visibility":10000,"wind":{"speed":4,"deg":150},"clouds":{"all":90},"dt":1606747118,"sys":{"type":1,"id":9029,"country":"RU","sunrise":1606714427,"sunset":1606741390},"timezone":10800,"id":524901,"name":"Moscow","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				fetchMock.get("https://localhost:3000/weather/city?q=Warsaw", mockResponseFromString(200, 
				'{"coord":{"lon":21.01,"lat":52.23},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":275.12,"feels_like":270.79,"temp_min":274.82,"temp_max":275.37,"pressure":1024,"humidity":64},"visibility":10000,"wind":{"speed":2.6,"deg":230},"clouds":{"all":0},"dt":1606746573,"sys":{"type":1,"id":1713,"country":"PL","sunrise":1606717310,"sunset":1606746482},"timezone":3600,"id":756135,"name":"Warsaw","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				fetchMock.get("https://localhost:3000/weather/city?q=Amsterdam", mockResponseFromString(200, '{"coord":{"lon":4.89,"lat":52.37},"weather":[{"id":701,"main":"Mist","description":"mist","icon":"50d"},{"id":310,"main":"Drizzle","description":"light intensity drizzle rain","icon":"09d"},{"id":500,"main":"Rain","description":"light rain","icon":"10d"}],"base":"stations","main":{"temp":279.19,"feels_like":273.24,"temp_min":278.15,"temp_max":279.82,"pressure":1018,"humidity":100},"visibility":1900,"wind":{"speed":7.2,"deg":200},"rain":{"1h":0.51},"clouds":{"all":75},"dt":1606746931,"sys":{"type":1,"id":1524,"country":"NL","sunrise":1606721223,"sunset":1606750309},"timezone":3600,"id":2759794,"name":"Amsterdam","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printFavoriteWeatherSpy();
				weather_retrieve.printFavoriteBoxes(function() {
					expect(getWeatherSpy.callCount).to.equal(3);
					expect(printWeatherSpy.callCount).to.equal(3);
					done();
				});
			});
		});
		describe('With an error response', function() {
			it('should call getWeather() 3 times and printFavoriteWeather() 0 times', function(done) {
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
				fetchMock.get("https://localhost:3000/weather/city?q=Moscow", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				fetchMock.get("https://localhost:3000/weather/city?q=Warsaw", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				fetchMock.get("https://localhost:3000/weather/city?q=Amsterdam", mockResponse(500, {"error": "500"}), { overwriteRoutes: false, repeat: 1 });
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printFavoriteWeatherSpy();
				weather_retrieve.printFavoriteBoxes(function() {
					expect(getWeatherSpy.callCount).to.equal(3);
					expect(printWeatherSpy.callCount).to.equal(0);
					done();
				});
			});
		});
	});
	
	
	describe('#printFavoriteWeather()', function() {
		it('should fill the aforementioned boxes with specific weather data', function(done) {
			weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
			weatherJson1 = JSON.parse('{"coord":{"lon":37.62,"lat":55.75},"weather":[{"id":600,"main":"Snow","description":"light snow","icon":"13n"}],"base":"stations","main":{"temp":274.23,"feels_like":269.48,"temp_min":274.15,"temp_max":274.26,"pressure":1028,"humidity":94},"visibility":10000,"wind":{"speed":4,"deg":150},"clouds":{"all":90},"dt":1606747118,"sys":{"type":1,"id":9029,"country":"RU","sunrise":1606714427,"sunset":1606741390},"timezone":10800,"id":524901,"name":"Moscow","cod":200}');
			weatherJson2 = JSON.parse('{"coord":{"lon":21.01,"lat":52.23},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":275.12,"feels_like":270.79,"temp_min":274.82,"temp_max":275.37,"pressure":1024,"humidity":64},"visibility":10000,"wind":{"speed":2.6,"deg":230},"clouds":{"all":0},"dt":1606746573,"sys":{"type":1,"id":1713,"country":"PL","sunrise":1606717310,"sunset":1606746482},"timezone":3600,"id":756135,"name":"Warsaw","cod":200}');
			weatherJson3 = JSON.parse('{"coord":{"lon":4.89,"lat":52.37},"weather":[{"id":701,"main":"Mist","description":"mist","icon":"50d"},{"id":310,"main":"Drizzle","description":"light intensity drizzle rain","icon":"09d"},{"id":500,"main":"Rain","description":"light rain","icon":"10d"}],"base":"stations","main":{"temp":279.19,"feels_like":273.24,"temp_min":278.15,"temp_max":279.82,"pressure":1018,"humidity":100},"visibility":1900,"wind":{"speed":7.2,"deg":200},"rain":{"1h":0.51},"clouds":{"all":75},"dt":1606746931,"sys":{"type":1,"id":1524,"country":"NL","sunrise":1606721223,"sunset":1606750309},"timezone":3600,"id":2759794,"name":"Amsterdam","cod":200}');
			weather_retrieve.printFavoriteWeather('Moscow', weatherJson1, function() {
				favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
				
				expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Moscow');
				expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[1].textContent).to.equal('1.1°C');
				expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[2].getAttribute("src")).to.equal('https://openweathermap.org/img/wn/13n@2x.png');
				
				selectedBoxWeatherDescription = favoriteBoxes[0].getElementsByClassName("weather_description")[0];
				expect(selectedBoxWeatherDescription.children[0].children[1].textContent).to.equal('Gentle wind, 4 m/s, South-southeast');
				expect(selectedBoxWeatherDescription.children[1].children[1].textContent).to.equal('Overcast');
				expect(selectedBoxWeatherDescription.children[2].children[1].textContent).to.equal('1028 hpa');
				expect(selectedBoxWeatherDescription.children[3].children[1].textContent).to.equal('94 %');
				expect(selectedBoxWeatherDescription.children[4].children[1].textContent).to.equal('[55.75, 37.62]');
			});
			weather_retrieve.printFavoriteWeather('Warsaw', weatherJson2, function() {
				favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
				expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Warsaw');
				expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[1].textContent).to.equal('2°C');
				expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[2].getAttribute("src")).to.equal('https://openweathermap.org/img/wn/01n@2x.png');
				
				selectedBoxWeatherDescription = favoriteBoxes[1].getElementsByClassName("weather_description")[0];
				expect(selectedBoxWeatherDescription.children[0].children[1].textContent).to.equal('Light breeze, 2.6 m/s, Southwest');
				expect(selectedBoxWeatherDescription.children[1].children[1].textContent).to.equal('Clear Skies');
				expect(selectedBoxWeatherDescription.children[2].children[1].textContent).to.equal('1024 hpa');
				expect(selectedBoxWeatherDescription.children[3].children[1].textContent).to.equal('64 %');
				expect(selectedBoxWeatherDescription.children[4].children[1].textContent).to.equal('[52.23, 21.01]');
			});
			weather_retrieve.printFavoriteWeather('Amsterdam', weatherJson3, function() {
				favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
				expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Amsterdam');
				expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[1].textContent).to.equal('6°C');
				expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[2].getAttribute("src")).to.equal('https://openweathermap.org/img/wn/50d@2x.png');
				
				selectedBoxWeatherDescription = favoriteBoxes[2].getElementsByClassName("weather_description")[0];
				expect(selectedBoxWeatherDescription.children[0].children[1].textContent).to.equal('Moderate wind, 7.2 m/s, South-southwest');
				expect(selectedBoxWeatherDescription.children[1].children[1].textContent).to.equal('Broken Clouds');
				expect(selectedBoxWeatherDescription.children[2].children[1].textContent).to.equal('1018 hpa');
				expect(selectedBoxWeatherDescription.children[3].children[1].textContent).to.equal('100 %');
				expect(selectedBoxWeatherDescription.children[4].children[1].textContent).to.equal('[52.37, 4.89]');
				
				done();
			});
		});
	});
	
	
	describe('#addFavCity()', function() {
		describe('With correct response from the database', function() {
			it('should add a 4th favorite city box according to the template, with the name set to London, and fill it with weather data', function(done) {
				fetchMock.get("https://localhost:3000/weather/city?q=London", mockResponseFromString(200, 
				'{"coord":{"lon":-0.13,"lat":51.51},"weather":[{"id":804,"main":"Clouds","description":"overcast clouds","icon":"04n"}],"base":"stations","main":{"temp":283.02,"feels_like":277.93,"temp_min":282.04,"temp_max":284.15,"pressure":1019,"humidity":81},"visibility":10000,"wind":{"speed":6.2,"deg":280},"clouds":{"all":100},"dt":1606762280,"sys":{"type":1,"id":1414,"country":"GB","sunrise":1606722189,"sunset":1606751752},"timezone":0,"id":2643743,"name":"London","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				fetchMock.post("https://localhost:3000/weather/favorites", mockResponseFromString(200, 
				'ok'), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printFavoriteWeatherSpy();
				weather_retrieve.addFavCity('London', function() {
					expect(weather_retrieve.favCityNames.length).to.equal(4);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					expect(weather_retrieve.favCityNames[3]).to.equal('London');
					expect(getWeatherSpy.callCount).to.equal(1);
					expect(printWeatherSpy.callCount).to.equal(1);
					done();
				});
			});
		});
		describe('When adding a city that is already on the list', function() {
			it('should not add a favorite city, and there should remain 3 of them', function(done) {
				fetchMock.get("https://localhost:3000/weather/city?q=Warsaw", mockResponseFromString(200, 
				'{"coord":{"lon":21.01,"lat":52.23},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":275.12,"feels_like":270.79,"temp_min":274.82,"temp_max":275.37,"pressure":1024,"humidity":64},"visibility":10000,"wind":{"speed":2.6,"deg":230},"clouds":{"all":0},"dt":1606746573,"sys":{"type":1,"id":1713,"country":"PL","sunrise":1606717310,"sunset":1606746482},"timezone":3600,"id":756135,"name":"Warsaw","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				fetchMock.post("https://localhost:3000/weather/favorites", mockResponseFromString(200, 
				'ok'), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printFavoriteWeatherSpy();
				weather_retrieve.addFavCity('Warsaw', function() {
					expect(weather_retrieve.favCityNames.length).to.equal(3);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					expect(getWeatherSpy.callCount).to.equal(0);
					expect(printWeatherSpy.callCount).to.equal(0);
					done();
				});
			});
		});
		describe('With an error response from the database', function() {
			it('should not add a favorite city, and there should remain 3 of them', function(done) {
				fetchMock.get("https://localhost:3000/weather/city?q=Warsaw", mockResponseFromString(200, 
				'{"coord":{"lon":21.01,"lat":52.23},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":275.12,"feels_like":270.79,"temp_min":274.82,"temp_max":275.37,"pressure":1024,"humidity":64},"visibility":10000,"wind":{"speed":2.6,"deg":230},"clouds":{"all":0},"dt":1606746573,"sys":{"type":1,"id":1713,"country":"PL","sunrise":1606717310,"sunset":1606746482},"timezone":3600,"id":756135,"name":"Warsaw","cod":200}'), { overwriteRoutes: false, repeat: 1 });
				fetchMock.post("https://localhost:3000/weather/favorites", mockResponseFromString(500, 
				'error'), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam']);
				var getWeatherSpy = weather_retrieve.getWeatherSpy();
				var printWeatherSpy = weather_retrieve.printFavoriteWeatherSpy();
				weather_retrieve.addFavCity('Warsaw', function() {
					expect(weather_retrieve.favCityNames.length).to.equal(3);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					expect(getWeatherSpy.callCount).to.equal(0);
					expect(printWeatherSpy.callCount).to.equal(0);
					done();
				});
			});
		});
	});
	
	describe('#deleteFavCity()', function() {
		describe('With correct response from the database', function() {
			it('should remove London from the list, and the London weather box from the page', function(done) {
				fetchMock.delete("https://localhost:3000/weather/favorites", mockResponseFromString(200, 
				'ok'), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam', 'London']);
				weather_retrieve.deleteFavCity('London', function() {
					expect(weather_retrieve.favCityNames.length).to.equal(3);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					
					favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
					expect(favoriteBoxes.length).to.equal(3);
					expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Moscow');
					expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Warsaw');
					expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Amsterdam');
					done();
				});
			});
		});
		describe('With an error response from the database', function() {
			it('should not remove a city from the list, and there should remain 3 of them', function(done) {
				fetchMock.delete("https://localhost:3000/weather/favorites", mockResponseFromString(500, 
				'error'), { overwriteRoutes: false, repeat: 1 });
				weather_retrieve.setFavCities(['Moscow', 'Warsaw', 'Amsterdam', 'London']);
				weather_retrieve.deleteFavCity('London', function() {
					expect(weather_retrieve.favCityNames.length).to.equal(3);
					expect(weather_retrieve.favCityNames[0]).to.equal('Moscow');
					expect(weather_retrieve.favCityNames[1]).to.equal('Warsaw');
					expect(weather_retrieve.favCityNames[2]).to.equal('Amsterdam');
					
					favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
					expect(favoriteBoxes.length).to.equal(3);
					expect(favoriteBoxes[0].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Moscow');
					expect(favoriteBoxes[1].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Warsaw');
					expect(favoriteBoxes[2].getElementsByClassName("city_title")[0].children[0].textContent).to.equal('Amsterdam');
					done();
				});
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