let degWind = [[11.25, 'North'], [33.75, 'North-northeast'], [56.25, 'Northeast'], [78.75, 'East-northeast'], [101.25, 'East'], [123.75, 'East-southeast'], [146.25, 'Southeast'], [168.75, 'South-southeast'], [191.25, 'South'], [213.75, 'South-southwest'], [236.25, 'Southwest'], [258.75, 'West-southwest'], [281.25, 'West'], [303.75, 'West-northwest'], [326.25, 'Northwest'], [348.75, 'North-northwest'], [360, 'North']];
let speedWind = [[0.2, 'Calm'], [1.5, 'Light air'], [3.3, 'Light breeze'], [5.4, 'Gentle wind'], [7.9, 'Moderate wind'], [10.7, 'Fresh breeze'], [13.8, 'Strong wind'], [17.1, 'High wind']];
let cloudCategories = [[25, 'Clear Skies'], [50, 'Scattered Clouds'], [76, 'Broken Clouds'], [100, 'Overcast']]

var favCityNames;
var localCity = 'Saint Petersburg'
var geolocFinished = false;
var localBox;

function loadWeather() {
	loadFavCities();
	getLocation();
	loadLocalBox();
	initializeFavoriteCityBoxes();
	printFavoriteBoxes();
}

function getLocation() {
	localBox = document.getElementsByClassName("local_box")[0];
	var geolocation = navigator.geolocation;
	geolocFinished = false;
	geolocation.getCurrentPosition(getCity, errorHandler, {maximumAge: 75000});
}

function errorHandler(err) {
	geolocFinished = true;
	document.getElementsByClassName("city_choice_list")[0].classList.remove("hidden");
}

function getCity(position) {
	fetch("https://cors-anywhere.herokuapp.com/http://api.geonames.org/findNearbyPlaceName?cities=cities5000&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&username=habsburgchin").then(response => response.text())
		.then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
		.then(data => {
				localCity = data.getElementsByTagName("geonames")[0].getElementsByTagName("geoname")[0].getElementsByTagName("name")[0].firstChild.nodeValue;
				geolocFinished = true;
			}
		).catch(function(error) {
			localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
		});
}

function loadLocalBox() {
	if(!geolocFinished) {
		window.setTimeout(loadLocalBox, 100);
	} else {
		getWeather(localCity, function(localCity, json) {printLocalWeather(localCity, json)});
	}
}

function getWeather(cityName, _callback) {
	fetch("https://cors-anywhere.herokuapp.com/http://api.openweathermap.org/data/2.5/weather?q=" + cityName + "&appid=05084c9b7c23be334330469ae0d59085").then(response => response.json()).then(json => {
			console.log(json);
			_callback(cityName, json);
		}
	).catch(function(error) {
		if(cityName == localCity) {
			localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
		}
		selectedWeatherBox = findCityBox(cityName);
		if(selectedWeatherBox != null) {
			selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Ошибка соединения.";
		}
	});
}

function printLocalWeather(localCity, weatherJson) {
	if(!weatherJson.hasOwnProperty("main")) {
		localBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
		return;
	}
	let main = weatherJson["main"];
	let wind = weatherJson["wind"];
	localBoxWeatherBox = document.getElementsByClassName("local_box")[0].getElementsByClassName("weather_box")[0];
	
	localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[1].textContent = (Math.round((main["temp"] - 273.15) * 10) / 10) + "°C";
	localBoxWeatherBox.getElementsByClassName("city_title")[0].getElementsByClassName("weather_indicator")[0].children[0].setAttribute("src", "http://openweathermap.org/img/wn/" + weatherJson["weather"][0]["icon"] + "@2x.png");
	
	localBoxWeatherDescription = localBoxWeatherBox.getElementsByClassName("weather_description")[0];
	localBoxWeatherDescription.children[0].children[1].textContent = getCategory(speedWind, wind["speed"]) + ", " + wind["speed"] + " m/s, " + getCategory(degWind, wind["deg"]);
	localBoxWeatherDescription.children[1].children[1].textContent = getCategory(cloudCategories, weatherJson["clouds"]["all"]);
	localBoxWeatherDescription.children[2].children[1].textContent = main["pressure"] + " hpa";
	localBoxWeatherDescription.children[3].children[1].textContent = main["humidity"] + " %";
	localBoxWeatherDescription.children[4].children[1].textContent = "[" + weatherJson["coord"]["lon"] + ", " + weatherJson["coord"]["lat"] + "]";
	unhideLocalWeather();
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
	for(var i = 0; i < favCityNames.length; i++) {
		createFavoriteCityBox(favCityNames[i]);
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

function printFavoriteBoxes() {
	for(var i = 0; i < favCityNames.length; i++) {
		getWeather(favCityNames[i], function(cityName, json) {printFavoriteWeather(cityName, json)});
	}
}

function printFavoriteWeather(cityName, weatherJson) {
	var selectedWeatherBox = findCityBox(cityName);
	if(!weatherJson.hasOwnProperty("main")) {
		selectedWeatherBox.getElementsByClassName("load_screen")[0].children[0].textContent = "Город не найден.";
		return;
	}
	let main = weatherJson["main"];
	let wind = weatherJson["wind"];
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[1].textContent = (Math.round((main["temp"] - 273.15) * 10) / 10) + "°C";
	selectedWeatherBox.getElementsByClassName("city_title")[0].children[2].setAttribute("src", "http://openweathermap.org/img/wn/" + weatherJson["weather"][0]["icon"] + "@2x.png");
	
	selectedBoxWeatherDescription = selectedWeatherBox.getElementsByClassName("weather_description")[0];
	selectedBoxWeatherDescription.children[0].children[1].textContent = getCategory(speedWind, wind["speed"]) + ", " + wind["speed"] + " m/s, " + getCategory(degWind, wind["deg"]);
	selectedBoxWeatherDescription.children[1].children[1].textContent = getCategory(cloudCategories, weatherJson["clouds"]["all"]);
	selectedBoxWeatherDescription.children[2].children[1].textContent = main["pressure"] + " hpa";
	selectedBoxWeatherDescription.children[3].children[1].textContent = main["humidity"] + " %";
	selectedBoxWeatherDescription.children[4].children[1].textContent = "[" + weatherJson["coord"]["lon"] + ", " + weatherJson["coord"]["lat"] + "]";
	unhideFavoriteWeather(selectedWeatherBox);
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
}

function loadFavCities() {
	if(localStorage.hasOwnProperty("favCities")) {
		favCityNames = JSON.parse(localStorage.getItem("favCities"));
	} else {
		favCityNames = [];
		localStorage.setItem("favCities", JSON.stringify(favCityNames));
	}
}

function addFavCity() {
	newCityName = document.getElementById("newcity").value;
	document.getElementById("newcity").value = "";
	if(favCityNames.includes(newCityName)) {
		return;
	}
	favCityNames.push(newCityName);
	localStorage.setItem("favCities", JSON.stringify(favCityNames));
	createFavoriteCityBox(newCityName);
	getWeather(newCityName, function(cityName, json) {printFavoriteWeather(cityName, json)});
}

function addFavCityOnEnter() {
	if(event.key == 'Enter') {
		addFavCity()
	}
}

function deleteFavCity(cityName) {
	for(var i = 0; i < favCityNames.length; i++) {
		if(favCityNames[i] == cityName) {
			favCityNames.splice(i, 1);
		}
	}
	localStorage.setItem("favCities", JSON.stringify(favCityNames));
	var selectedWeatherBox = findCityBox(cityName);
	selectedWeatherBox.parentNode.removeChild(selectedWeatherBox);
}

function reloadFavWeather(cityName) {
	hideFavoriteWeather(findCityBox(cityName));
	getWeather(cityName, function(cityName, json) {printFavoriteWeather(cityName, json)});
}

function chooseLocalCity() {
	localCity = document.getElementById("localcity").value;
	document.getElementById("localcity").value = "";
	hideLocalWeather();
	loadLocalBox();
	document.getElementsByClassName("city_choice_list")[0].classList.add("hidden");
}

function chooseLocalCityOnEnter() {
	if(event.key == 'Enter') {
		chooseLocalCity()
	}
}