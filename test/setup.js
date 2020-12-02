var jsdom = require('jsdom');

const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('<!DOCTYPE html>\
\
<html class="general_style">\
\
<head>\
	<title>Погода в Санкт-Петербурге и еще 42 городах</title>\
	<link rel="stylesheet" href="styles.css">\
	<script src="weather_retrieve.js"></script>\
</head>\
\
<body onload="loadWeather();">\
\
<header class="local_weather_header">\
	<h1>\
		Погода здесь\
	</h1>\
	<button class="reload_button" onclick="reloadGeoloc();">\
		Обновить геолокацию\
	</button>\
</header>\
\
<main class="main_part">\
	<div class="city_choice_list hidden">\
		<div class="city_choice_content">\
			<p>Выберите город</p>\
			<form id="local_city_form">\
				<input type="text" class="input_fav_city" name="cityname" id="localcity" value="Saint Petersburg">\
				<input type="submit" class="city_ok_button" value="Выбрать">\
			</form>\
		</div>\
	</div>\
	<article class="local_box">\
		<section class="load_screen">\
			<p>Подождите, данные загружаются</p>\
			<button class="reload_button" onclick="reloadLocalWeather();">\
				Обновить температуру\
			</button>\
		</section>\
		<section class="weather_box hidden">\
			<div class="city_title">\
				<h3>Saint Petersburg</h3>\
				<div class="weather_indicator">\
					<image class="weather_icon" alt="Иконка погоды"></image>\
					<p>8°C</p>\
				</div>\
			</div>\
			<div class="weather_description">\
				<p>\
					<span>Ветер</span>\
					<span>Moderate breeze, 6.0 m/s, North-northwest</span>\
				</p>\
				<p>\
					<span>Облачность</span>\
					<span>Broken clouds</span>\
				</p>\
				<p>\
					<span>Давление</span>\
					<span>1013 hpa</span>\
				</p>\
				<p>\
					<span>Влажность</span>\
					<span>52 %</span>\
				</p>\
				<p>\
					<span>Координаты</span>\
					<span>[59.88, 30.42]</span>\
				</p>\
			</div>\
		</section>\
	</article>\
	<section class="favorite_title">\
		<h2>Избранное</h2>\
		<form id="fav_city_form">\
			<input type="text" class="input_fav_city" name="cityname" id="newcity" placeholder="Добавить новый город">\
			<input type="submit" class="add_button" value="+">\
		</form>\
	</section>\
	<article class="favorite_boxes">\
	</article>\
	\
	<template id="favweatherbox">\
		<section class="weather_box">\
			<div class="city_title">\
				<h3></h3>\
				<p class="temperature"></p>\
				<image class="weather_icon hidden" alt="Иконка погоды"></image>\
				<button class="delete_button">✕</p>\
			</div>\
			<section class="load_screen">\
				<p>Подождите, данные загружаются</p>\
				<button class="reload_button" onclick="reloadFavWeather();">\
					Обновить температуру\
				</button>\
			</section>\
			<div class="weather_description hidden">\
				<p>\
					<span>Ветер</span>\
					<span></span>\
				</p>\
				<p>\
					<span>Облачность</span>\
					<span></span>\
				</p>\
				<p>\
					<span>Давление</span>\
					<span></span>\
				</p>\
				<p>\
					<span>Влажность</span>\
					<span></span>\
				</p>\
				<p>\
					<span>Координаты</span>\
					<span></span>\
				</p>\
			</div>\
		</section>\
	</template>\
	\
</main>\
\
</body>\
\
</html>')).window;
global.document = document;
global.window = document.defaultView;
global.navigator = {
  userAgent: 'node.js'
};

var Promise = require('es6-promise').Promise;
Promise.polyfill();

var fetch = require('isomorphic-fetch');