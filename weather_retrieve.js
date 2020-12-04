const sinon = require("sinon");

var degWind;
var speedWind;
var cloudCategories;

var favCityNames = [];
var localCity = 'Saint Petersburg'
var geolocFinished = false;
var geolocRefused = false;
var favCitiesRetrieved = false;
var favCityBoxesInitialized = false;
var localBox;

var getWeatherReal;
var printLocalWeatherReal;
var printFavoriteWeatherReal;

var geolocCallback;

exports.favCityNames = favCityNames;
exports.localCity = localCity;
exports.geolocFinished = geolocFinished;
exports.favCitiesRetrieved = favCitiesRetrieved;
exports.favCityBoxesInitialized = favCityBoxesInitialized;

function loadWeather() {
	iniCategories();
	getWeatherReal = getWeather;
	printFavoriteWeatherReal = printFavoriteWeather;
	printLocalWeatherReal = printLocalWeather;
	loadFavCities();
	getLocation();
	loadLocalBox();
	configureLocalCityForm();
	configureFavCityForm();
	initializeFavoriteCityBoxes();
	printFavoriteBoxes();
}

function iniCategories() {
	degWind = [[11.25, 'North'], [33.75, 'North-northeast'], [56.25, 'Northeast'], [78.75, 'East-northeast'], [101.25, 'East'], [123.75, 'East-southeast'], [146.25, 'Southeast'], [168.75, 'South-southeast'], [191.25, 'South'], [213.75, 'South-southwest'], [236.25, 'Southwest'], [258.75, 'West-southwest'], [281.25, 'West'], [303.75, 'West-northwest'], [326.25, 'Northwest'], [348.75, 'North-northwest'], [360, 'North']];
	speedWind = [[0.2, 'Calm'], [1.5, 'Light air'], [3.3, 'Light breeze'], [5.4, 'Gentle wind'], [7.9, 'Moderate wind'], [10.7, 'Fresh breeze'], [13.8, 'Strong wind'], [17.1, 'High wind']];
	cloudCategories = [[25, 'Clear Skies'], [50, 'Scattered Clouds'], [76, 'Broken Clouds'], [100, 'Overcast']];
}

exports.iniCategories = function(_callback) {
	iniCategories();
	exports.degWind = degWind;
	exports.speedWind = speedWind;
	exports.cloudCategories = cloudCategories;
	if(_callback) {
		_callback();
	}
}

function getLocation(_callback) {
	geolocCallback = _callback;
	if(!geolocRefused) {
		geolocFinished = false;
	}
	localBox = document.getElementsByClassName("local_box")[0];
	var geolocation = navigator.geolocation;
	geolocation.getCurrentPosition(getCity, errorHandler, {maximumAge: 75000});
}

exports.getLocation = function(_callback) {
	getLocation(function() {
		exports.geolocFinished = geolocFinished;
		exports.localCity = localCity;
		console.log(localCity);
		if(_callback) {
			_callback();
		}
	});
}

function errorHandler(err) {
	document.getElementsByClassName("city_choice_list")[0].classList.remove("hidden");
	geolocRefused = true;
	geolocFinished = true;
	if(geolocCallback) {
		geolocCallback();
	}
}

function getCity(position) {
	geolocRefused = false;
	fetch("https://localhost:3000/weather/coordinates?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude).then(response => response.text())
		.then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
		.then(data => {
				geonames = data.getElementsByTagName("geonames")[0];
				if(geonames.getElementsByTagName("geoname").length > 0) {
					localCity = geonames.getElementsByTagName("geoname")[0].getElementsByTagName("name")[0].firstChild.nodeValue;
				} else {
					localCity = "Middle of Nowhere"
				}
				geolocFinished = true;
				if(geolocCallback) {
					geolocCallback();
				}
			}
		).catch(function(error) {
			localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
			if(geolocCallback) {
				geolocCallback();
			}
		});
}

function loadLocalBox(_callback) {
	if(!geolocFinished) {
		window.setTimeout(loadLocalBox, 100);
	} else {
		getWeatherReal(localCity, function(localCity, json, _test_callback) {printLocalWeatherReal(localCity, json, _test_callback)}, _callback);
	}
}

exports.loadLocalBox = function(_callback) {
	loadLocalBox(_callback);
}

function getWeather(cityName, _callback, _test_callback) {
	fetch("https://localhost:3000/weather/city?q=" + cityName).then(response => response.text()).then(text => {
			//console.log(text);
			weatherJson = JSON.parse(text);
			if(!weatherJson.hasOwnProperty("main")) {
				if(cityName == localCity) {
					localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
				}
				selectedWeatherBox = findCityBox(cityName);
				if(selectedWeatherBox != null) {
					selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
				}
				if(_test_callback) {
					_test_callback();
				}
				return;
			}
			_callback(cityName, weatherJson, _test_callback);
		}
	).catch(function(error) {
		if(cityName == localCity) {
			localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
		}
		selectedWeatherBox = findCityBox(cityName);
		if(selectedWeatherBox != null) {
			selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
		}
		console.log(error);
		if(_test_callback) {
			_test_callback();
		}
	});
}

exports.getWeatherSpy = function() {
	getWeatherReal = sinon.spy(getWeather);
	return getWeatherReal;
}

exports.getWeather = function(cityName, _callback, _test_callback) {
	getWeather(cityName, _callback, _test_callback);
}

function printLocalWeather(localCity, weatherJson, _callback) {
	if(!weatherJson.hasOwnProperty("main")) {
		localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
		if(_callback) {
			_callback();
		}
		return;
	}
	let main = weatherJson["main"];
	let wind = weatherJson["wind"];
	localBoxWeatherBox = document.getElementsByClassName("local_box")[0].getElementsByClassName("weather_box")[0];
	
	localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[1].textContent = (Math.round((main["temp"] - 273.15) * 10) / 10) + "°C";
	localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[0].setAttribute("src", "https://openweathermap.org/img/wn/" + weatherJson["weather"][0]["icon"] + "@2x.png");
	
	localBoxWeatherDescription = localBoxWeatherBox.getElementsByClassName("weather_description")[0];
	localBoxWeatherDescription.children[0].children[1].textContent = getCategory(speedWind, wind["speed"]) + ", " + wind["speed"] + " m/s, " + getCategory(degWind, wind["deg"]);
	localBoxWeatherDescription.children[1].children[1].textContent = getCategory(cloudCategories, weatherJson["clouds"]["all"]);
	localBoxWeatherDescription.children[2].children[1].textContent = main["pressure"] + " hpa";
	localBoxWeatherDescription.children[3].children[1].textContent = main["humidity"] + " %";
	localBoxWeatherDescription.children[4].children[1].textContent = "[" + weatherJson["coord"]["lat"] + ", " + weatherJson["coord"]["lon"] + "]";
	unhideLocalWeather();
	if(_callback) {
		_callback();
	}
}

exports.printLocalWeatherSpy = function() {
	printLocalWeatherReal = sinon.spy(printLocalWeather);
	return printLocalWeatherReal;
}

exports.printLocalWeather = function(weatherJson, _callback) {
	printLocalWeather(localCity, weatherJson, _callback);
}

function unhideLocalWeather() {
	localBox = document.getElementsByClassName("local_box")[0];
	localBox.getElementsByClassName("load_screen")[0].classList.add("hidden");
	localBoxWeatherBox = localBox.getElementsByClassName("weather_box")[0];
	localBoxWeatherBox.classList.remove("hidden");
	localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByTagName("h3")[0].textContent = localCity;
}

function hideLocalWeather() {
	localBox = document.getElementsByClassName("local_box")[0];
	localBox.getElementsByClassName("load_screen")[0].classList.remove("hidden");
	localBoxWeatherBox = localBox.getElementsByClassName("weather_box")[0];
	localBoxWeatherBox.classList.add("hidden");
	localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Подождите, данные загружаются";
}

function reloadGeoloc() {
	hideLocalWeather();
	getLocation();
	loadLocalBox();
}

function reloadLocalWeather() {
	hideLocalWeather();
	loadLocalBox();
}

function getCategory(categories, value) {
	for(var i = 0; i < categories.length; i++) {
		if(value < categories[i][0]) {
			return categories[i][1];
		}
	}
	return categories[categories.length - 1][1];
}

function initializeFavoriteCityBoxes() {
	if(!favCitiesRetrieved) {
		window.setTimeout(initializeFavoriteCityBoxes, 100);
	} else {
		for(var i = 0; i < favCityNames.length; i++) {
			createFavoriteCityBox(favCityNames[i]);
		}
		favCityBoxesInitialized = true;
	}
}

exports.initializeFavoriteCityBoxes = function(_callback) {
	initializeFavoriteCityBoxes();
	if(_callback) {
		_callback();
	}
}

function createFavoriteCityBox(cityName) {
	favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0];
	
	boxTemplate = document.getElementById("favweatherbox");
	newBox = boxTemplate.content.firstElementChild.cloneNode(true);
	favoriteBoxes.appendChild(newBox);
	
	newBox.getElementsByClassName("city_title")[0].children[0].textContent = cityName;
	
	deleteButton = newBox.getElementsByClassName("city_title")[0].getElementsByClassName("delete_button")[0];
	deleteButton.onclick = function() {
		deleteFavCity(cityName);
	}
	
	reloadButton = newBox.getElementsByClassName("load_screen")[0].getElementsByClassName("reload_button")[0];
	reloadButton.onclick = function() {
		reloadFavWeather(cityName);
	}
}

function printFavoriteBoxes(_callback) {
	if(!favCityBoxesInitialized) {
		window.setTimeout(printFavoriteBoxes, 100);
	} else {
		for(var i = 0; i < favCityNames.length; i++) {
			if(i == favCityNames.length - 1) {
				getWeatherReal(favCityNames[i], function(cityName, json, _test_callback) {printFavoriteWeatherReal(cityName, json, _test_callback)}, _callback);
			} else {
				getWeatherReal(favCityNames[i], function(cityName, json) {printFavoriteWeatherReal(cityName, json)});
			}
		}
	}
}

exports.printFavoriteBoxes = function(_callback) {
	printFavoriteBoxes(_callback);
}

function printFavoriteWeather(cityName, weatherJson, _callback) {
	var selectedWeatherBox = findCityBox(cityName);
	if(!weatherJson.hasOwnProperty("main")) {
		selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
		if(_callback) {
			_callback();
		}
		return;
	}
	let main = weatherJson["main"];
	let wind = weatherJson["wind"];
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[1].textContent = (Math.round((main["temp"] - 273.15) * 10) / 10) + "°C";
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[2].setAttribute("src", "https://openweathermap.org/img/wn/" + weatherJson["weather"][0]["icon"] + "@2x.png");
	
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[2].classList.remove("hidden");
	
	selectedBoxWeatherDescription = selectedWeatherBox.getElementsByClassName("weather_description")[0];
	selectedBoxWeatherDescription.children[0].children[1].textContent = getCategory(speedWind, wind["speed"]) + ", " + wind["speed"] + " m/s, " + getCategory(degWind, wind["deg"]);
	selectedBoxWeatherDescription.children[1].children[1].textContent = getCategory(cloudCategories, weatherJson["clouds"]["all"]);
	selectedBoxWeatherDescription.children[2].children[1].textContent = main["pressure"] + " hpa";
	selectedBoxWeatherDescription.children[3].children[1].textContent = main["humidity"] + " %";
	selectedBoxWeatherDescription.children[4].children[1].textContent = "[" + weatherJson["coord"]["lat"] + ", " + weatherJson["coord"]["lon"] + "]";
	unhideFavoriteWeather(selectedWeatherBox);
	if(_callback) {
		_callback();
	}
}

exports.printFavoriteWeatherSpy = function() {
	printFavoriteWeatherReal = sinon.spy(printFavoriteWeather);
	return printFavoriteWeatherReal;
}

exports.printFavoriteWeather = function(cityName, weatherJson, _callback) {
	printFavoriteWeather(cityName, weatherJson);
	if(_callback) {
		_callback();
	}
}

function findCityBox(cityName) {
	favoriteBoxes = document.getElementsByClassName("favorite_boxes")[0].getElementsByClassName("weather_box");
	var selectedWeatherBox = null;
	for(var i = 0; i < favoriteBoxes.length; i++) {
		if(favoriteBoxes[i].getElementsByClassName("city_title")[0].children[0].textContent == cityName) {
			selectedWeatherBox = favoriteBoxes[i];
		}
	}
	return selectedWeatherBox;
}

function unhideFavoriteWeather(selectedWeatherBox) {
	selectedWeatherBox.getElementsByClassName("load_screen")[0].classList.add("hidden");
	selectedWeatherBox.getElementsByClassName("weather_description")[0].classList.remove("hidden");
	selectedWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_icon")[0].classList.remove("hidden");
}

function hideFavoriteWeather(selectedWeatherBox) {
	selectedWeatherBox.getElementsByClassName("load_screen")[0].classList.remove("hidden");
		selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Подождите, данные загружаются";
	selectedWeatherBox.getElementsByClassName("weather_description")[0].classList.add("hidden");
	selectedWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_icon")[0].classList.add("hidden");
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[2].classList.add("hidden");
}

function loadFavCities(_callback) {
	fetch("https://localhost:3000/weather/favorites").then(response => response.text()).then(text => {
			favCityNames = JSON.parse(text);
			if(!Array.isArray(favCityNames)) {
				favCityNames = [];
			}
			favCitiesRetrieved = true;
			if(_callback) {
				_callback();
			}
		}
	).catch(function(error) {
		console.log(error);
		favCitiesRetrieved = true;
	});
}

exports.loadFavCities = function(_callback) {
	loadFavCities(function() {
		exports.favCityNames = favCityNames;
		exports.favCitiesRetrieved = favCitiesRetrieved;
		_callback();
	});
}

function configureFavCityForm() {
	newCityForm = document.getElementById("fav_city_form");
	newCityForm.addEventListener("submit", function(e) {
		e.preventDefault();
		addFavCity();
	});
}

function addFavCity(_callback) {
	newCityName = document.getElementById("newcity").value;
	document.getElementById("newcity").value = "";
	if(favCityNames.includes(newCityName)) {
		document.getElementById("newcity").placeholder = "Этот город уже есть в списке.";
		if(_callback) {
			_callback();
		}
		return;
	} else {
		document.getElementById("newcity").placeholder = "Добавить новый город";
	}
	fetch("https://localhost:3000/weather/favorites", {
			method: 'POST',
			body: newCityName,
			headers: {"Origin": "localhost:3000/"
			}
		}
	).then(function() {
		favCityNames.push(newCityName);
		createFavoriteCityBox(newCityName);
		getWeatherReal(newCityName, function(cityName, json) {printFavoriteWeatherReal(cityName, json, _callback)});
	}).catch(function(error) {
		document.getElementById("newcity").placeholder = "Ошибка соединения с базой данных.";
	});
}

exports.addFavCity = function(newCityName, _callback) {
	document.getElementById("newcity").value = newCityName;
	addFavCity(function() {
		exports.favCityNames = favCityNames;
		_callback();
	});
}

function deleteFavCity(cityName, _callback) {
	fetch("https://localhost:3000/weather/favorites", {
			method: 'DELETE',
			body: cityName,
			headers: {"Origin": "localhost:3000/"
			}
		}
	).then(function() {
		for(var i = 0; i < favCityNames.length; i++) {
			if(favCityNames[i] == cityName) {
				favCityNames.splice(i, 1);
			}
		}
		var selectedWeatherBox = findCityBox(cityName);
		selectedWeatherBox.parentNode.removeChild(selectedWeatherBox);
		if(_callback) {
			_callback();
		}
	}).catch(function(error) {
		document.getElementById("newcity").placeholder = "Ошибка соединения с базой данных.";
		if(_callback) {
			_callback();
		}
		return;
	});
}

exports.deleteFavCity = function(cityName, _callback) {
	deleteFavCity(cityName, function() {
		exports.favCityNames = favCityNames;
		if(_callback) {
			_callback();
		}
	});
}

function reloadFavWeather(cityName) {
	hideFavoriteWeather(findCityBox(cityName));
	getWeatherReal(cityName, function(cityName, json) {printFavoriteWeatherReal(cityName, json)});
}

function configureLocalCityForm() {
	localCityForm = document.getElementById("local_city_form");
	localCityForm.addEventListener("submit", function(e) {
		e.preventDefault();
		chooseLocalCity();
	});
}

function chooseLocalCity() {
	localCity = document.getElementById("localcity").value;
	document.getElementById("localcity").value = "";
	hideLocalWeather();
	loadLocalBox();
	document.getElementsByClassName("city_choice_list")[0].classList.add("hidden");
}

exports.setLocalCity = function(newCity) {
	localCity = newCity;
	exports.localCity = localCity;
	geolocFinished = true;
}

exports.setFavCities = function(newCities) {
	favCityNames = newCities;
	exports.favCityNames = favCityNames;
	favCitiesRetrieved = true;
}