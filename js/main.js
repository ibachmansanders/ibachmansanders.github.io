/* Main JavaScript sheet, Ian Bachman-Sanders, February 2017*/


//Add Leaflet Map to Website
function loadmap() {
    //create map object, targeting the ID 'mapid' and returning a map object based on .setView
    var mymap = L.map('mapid', {
        center: [40, -98.5],
        zoom: 5
    }); // default settings will allow mouse/touch interactions, zoom, etc.

    //add tile layer  to the map object
    //TODO create a more aestheticically targeted TileSet
    L.tileLayer('https://api.mapbox.com/styles/v1/ibachmansanders/ciz09xah6000h2srz44ap614z/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaWJhY2htYW5zYW5kZXJzIiwiYSI6ImNpc2dhMHVrcjAxcTQyeXZvZnBhZGU3YmoifQ.m7jyxFEjRPWo_P49zpn3FA', {
    attribution: '© <a href=https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
    subdomains: 'abcd',
    maxZoom: 19  
    }).addTo(mymap);

    //once the map is added, load the cities data!
    getData(mymap);

    $(document).click(function(){
    	console.log('hello!');
    	$("#welcomeWrapper").hide();
    });
};

//Using AJAX to load city geoJSON data from your MegaCities geoJSON file and apply style
function getData(mymap) {
    $.ajax("data/CitiesCommute.geojson", {
        dataType: "json",
        success: function(response){
        	//create an attributes array for temporal slider that calls a function processing data
        	var attributes = processData(response);
        	//call function to create and style prop symbols
        	createPropSymbols(response, mymap, attributes);
        	//call function to create time slider
        	createYearSlider(mymap, attributes);
        	//call filter function
        	filterClick(mymap, attributes);
        }
    });
};

//Build an attributes array to sequence through for slider
function processData(data){
	//create an empty array
	var attributes = [];
	//isolate properties of the first feature in the dataset
	var properties = data.features[0].properties;
	//push each attribute name into the attributes array
	for (var attribute in properties){
		//take all attributes save city
		if (attribute != "City"){
			attributes.push(attribute);
		};
	};
	return attributes;
};

//Add circle markers for point features to the map
// use this crazy function w/in function to assign the current attribute based on the index of the attributes array DON'T UNDERSTAND
function createPropSymbols(data, map, attributes) {
	//create a Leaflet geoJSON layer and add it to the map, applying the style object
	var markers = L.geoJson(data, {
		//call pointToLayer, but return it including the value of the attributes included
		pointToLayer: function(feature, latlng) {
			return pointToLayer(feature, latlng, attributes);
		}
	}).addTo(map);
	//if exist a prop symbol panel, update it with new values for the year
	currentCity(map);
};

function filterClick(map, attributes){
	var index;
	//Home-made filter function- first define the index to match the modality type
	$('.menu-ui a').on('click', function() {
    	$(this).addClass("active").siblings().removeClass("active");
    	//set index to allow me to compare all layer values to the max values
    	try {
	    	if ($(this).data('filter') === 'all') {index = 6;}
	    		else if ($(this).data('filter') === 'drive') {index = 0;}
	    			else if ($(this).data('filter') === 'pubTrans') {index = 1;}
	    				else if ($(this).data('filter') === 'walk') {index = 2;}
	    					else if ($(this).data('filter') === 'bike') {index = 3;}
	    						else if ($(this).data('filter') ==='other') {index = 4;}
	    							else {index = 5;};
	    	//if the button clicked was all, reload all layers at same value.
			if (index === 6) {
				//initialize layer, and reload
				var maxValsAttr = maxFunction(map,attributes);
				//call filterFunction using the product of maxFunction
				filterFunction(map,maxValsAttr[0],maxValsAttr[1],8);
			} else {
		    	//call maxFunction to identify maxvalues in current layers, and store them and their keys (yearModality in the function).
				var maxValsAttr = maxFunction(map,attributes);
				//call filterFunction using the product of maxFunction
				filterFunction(map,maxValsAttr[0],maxValsAttr[1],index);
			};
		} catch(err){};
	});
};

//FILTERING OPERATOR: ISOLATE THE MAX VALUES ON EACH LOAD
//Includes a callback as a parameter refering to the filterFunction
//...filterFunction will then only run once the maxFunction has completed
function maxFunction(map, attributes) {
	//initialize the map (in case a filter is already applied)reload geoJSON data, and add new piechart icon layer with updated values
	map.eachLayer(function(layer) {
		if (layer.options.data && layer.options.radius) {map.removeLayer(layer);};
	});
	$.ajax("data/CitiesCommute.geojson", {
        dataType: "json",
        success: function(response){
        	//call function to create and style prop symbols
        	createPropSymbols(response, map, attributes);
        },
        async: false
    });
	//initialize max values to be used in isolating max city
	var maxes = [0,0,0,0,0,0];
	//each time prop symbols are created, collect them in arrays to identify the max of each modality type
	var cityVal = []; //create an array to hold each city's values
	var yearMod = [];
	//iterate through each layer (city), and store its commute data
	map.eachLayer(function(layer){
		if (layer.options.data && layer.options.radius) {
			var commuteVals = [];
			var yearModality = [(layer.options.data[0].name.substr(0,4) + " Commute Time")]; //initialize yearModality with the key for commute time
			try {
				for (i=0; i < layer.options.data.length; i++) {
					commuteVals.push(layer.options.data[i].value);
					yearModality.push(layer.options.data[i].name);
				};
			} catch(err) {pass};
		//push this city's attributes to cityVal.  Define yearMod with yearModality, to be used later
		cityVal.push(commuteVals);
		yearMod = yearModality;
		};
	});
	//iterate through cityVal, comparing values within each cityVal array to overall maxes, creating an array of max values for each modality
	for (i=0; i < cityVal.length; i++) {
		for (a=0; a < maxes.length; a++) {
			if (cityVal[i][a] > maxes[a]) {
				maxes[a] = cityVal[i][a];
			};
		};
	};
	//return attributes (yearModality = year and modality) and maxes for use in filterFunction
	return [yearMod, maxes];
};

//FILTERING OPERATOR PART 2
function filterFunction(map,attributes,maxes,index) { //TODO why don't maxes update when you change year?
	//cycle through the layers, applying the index to remove non-max values
	map.eachLayer(function(layer){
		//go through each layer...
		if (layer.options.data && layer.options.radius) {
			try{
    			//find the city(s) with the max value, and remove every layer but them
    			if (layer.options.data[index].value != maxes[Number(index)]) {
					map.removeLayer(layer);
    			};
    		} catch(err){};
		};
	});
};

//Create slider widget to sequence through yesrs
function createYearSlider(map, attributes){
	//create range input element (slider) IF it doesn't already exist
	$('#controls').append('<input class="range-slider" type="range">');
	//set slider attributes
	$('.range-slider').attr({
		max:70,
		min:0,
		value:0,
		step:7
	});
	//Add skip buttons in addition to slider
	$('#controls').append('<button class="skip" id="backward">Last</button>');
	$('#controls').append('<button class="skip" id="forward">Next</button>');
	//use arrows for buttons
	$('#backward').html('<img src="img/backward.png">');
	$('#forward').html('<img src="img/forward.png">');
	//Listen for user input via clicker and slider (affordances)
	$('.range-slider').on('input', function(){
		//use the slider's value (which lines up with the number of attributes) to create an index value
		var index = $(this).val();
		//access the range of the geoJSON array needed for PIE wedges
		var range = attributes.slice(index, index + 7);
		//Pass the new attribute to update symbols
		updatePropSymbols(map, range);
	});
	$('.skip').click(function(){ //on click execute an action
		//get current index
		var index = parseInt($('.range-slider').val());
		//conditional responses based on the button clicked
		if ($(this).attr('id') == 'forward'){
			index += 7;
			index = index > 70 ? 70 : index; //if slider is at the end of it's range, don't go higher (do we want this?)
		} else if ($(this).attr('id') == 'backward'){
			index -= 7;
			index = index < 0 ? 0 : index; //if index is at the beginning of it's range, don't go lower
		};
		//update the slider index
		$('.range-slider').val(index);
		//access the range of the geoJSON array needed for PIE wedges
		var range = attributes.slice(index, index + 7);
		//Pass the new attribute to update symbols
		updatePropSymbols(map, range);
		//make sure the active filter button is 'show all cities'
		$("#showAll").addClass('active').siblings().removeClass('active');
	});
};

//draw piechart layer
function pointToLayer(feature, latlng, attributes){
	//as pointToLayer iterates through each feature, collect the value for the selected attribute
	//assign the current attribute based on the first index of the attribute array
	var time = attributes[0];
	var timeVal = Number(feature.properties[time]); //Number() forces string values into numbers
	//do the same for commute types:
	var drive = attributes[1];
	var driveVal = Number(feature.properties[drive]);
	var pubTrans = attributes[2];
	var pubTransVal = Number(feature.properties[pubTrans]);
	var walk = attributes[3];
	var walkVal = Number(feature.properties[walk]);
	var bike = attributes[4];
	var bikeVal = Number(feature.properties[bike]);
	var other = attributes[5];
	var otherVal = Number(feature.properties[other]);
	var home = attributes[6];
	var homeVal = Number(feature.properties[home]);
	//apply attValue to a style object for city markers
	var iconStyle1 = {
		radius: timeVal, //I'd prefer to use linear space to show the commute time, rather than volume, as that's harder for the brain to process
		data: [
			{name: drive, value : driveVal, style: { fillStyle: 'rgba(230,171,2,.6)', strokeStyle: 'rgba(230,171,2,.7)', lineWidth: 3}},
			{name: pubTrans, value : pubTransVal, style: { fillStyle: 'rgba(217,95,2,.6)', strokeStyle: 'rgba(217,95,2,.7)', lineWidth: 3}},
			{name: walk, value : walkVal, style: { fillStyle: 'rgba(102,166,30,.6)', strokeStyle: 'rgba(102,166,30,.7)', lineWidth: 3}},
			{name: bike, value : bikeVal, style: { fillStyle: 'rgba(27,158,119,.6)', strokeStyle: 'rgba(27,158,119,.7)', lineWidth: 3}},
			{name: other, value : otherVal, style: { fillStyle: 'rgba(231,41,138,.6)', strokeStyle: 'rgba(231,41,138,.7)', lineWidth: 3}},
			{name: home, value : homeVal, style: { fillStyle: 'rgba(189,189,189,.6)', strokeStyle: 'rgba(189,189,189,.7)', lineWidth: 3}}
		]
	};
	//create piechartmarker layer (to bind things to) -- this is based on the work and property of https://github.com/sashakavun
	var layer = L.piechartMarker(latlng, iconStyle1);
	//build popup
	var popupContent = "<p><strong>" + feature.properties.City + "</strong>" + "<br>" + time + ": " + timeVal + " minutes</p>";

	//build panelContent
	var panelName = "<p><strong>" + feature.properties.City + "</strong></p>";
	var panelContent = "<p>Average " + time + ": " + timeVal + " minutes</p>";

	//bind popup to layer
	layer.bindPopup(popupContent, {
		offset: new L.Point(-iconStyle1.radius,-(iconStyle1.radius*1.5)) //offset where the popup appears so that it doesn't obscure the icon
	});
	//event listeners to open popup on hover
	layer.on({
		mouseover: function(){
			this.openPopup();
		},
		mouseout: function(){
			this.closePopup();
		}, 
		click: function(){
			//update both panel content and create a piechart for the selected city with more detail
			$("#panelName").html(panelName);
			$("#panel").html(panelContent);
			pieChart(drive,driveVal,pubTrans,pubTransVal,walk,walkVal,bike,bikeVal,other,otherVal,home,homeVal,timeVal);
		}
	});
	//return the layers to the createPropSymbols function to add to the map
	return layer;
};

function updatePropSymbols(map, attributes){
	//delete the previous layer of icons *this is the only way I could find that includes piecharts (icons) and also updates.
	map.eachLayer(function(layer){
	    if( layer instanceof L.TileLayer === false ) {
        	map.removeLayer(layer);
	    };
	});

	//reload geoJSON data, and add new piechart icon layer with updated values
	$.ajax("data/CitiesCommute.geojson", {
        dataType: "json",
        success: function(response){
        	//call function to create and style prop symbols
        	createPropSymbols(response, map, attributes);
        }
    });
    //recreate filterClick
    filterClick(map, attributes);
    //Update simple temporal legend for time tracking
    var legendText = "<h2>" + attributes[0] + "</h2>";
	$("#temporalLegend").html(legendText);
};

//DRAWING FUNCTIONS FOR PANEL PIECHART
var chart;
function pieChart(drive,driveVal,pubTrans,pubTransVal,walk,walkVal,bike,bikeVal,other,otherVal,home,homeVal,timeVal){
	//BUILD PIECHART (FYI I tried to build my own piechart, but it was hard to display.  I got distracted.)
	var pieCanvas = document.getElementById("pieCanvas");
	//show pieCanvas
	pieCanvas.style.display = 'inline';
	pieCanvas.width = "400px";
	pieCanvas.height = "400px";

	//start using Google's fancy piecharts (I made my own, but got hung up on fitting in data. sigh. #humblepie)
	google.charts.load('current', {'packages':['corechart']});
	google.charts.setOnLoadCallback(drawChart);

	function drawChart() {
		//establish data based on current city (pulled into the function as options)
	    var data = google.visualization.arrayToDataTable([
	      ['Modality', '% of Working Population'], //only if I want a title
	      ['Drive', driveVal],
	      ['Transit', pubTransVal],
	      ['Walk', walkVal],
	      ['Bike', bikeVal],
	      ['Other', otherVal],
	      ['Home', homeVal]
	    ]);
	    var options = {
	    	chartArea: {
	    		width: 300 * (timeVal/38.17), //adjust chart width by the length of the commute
	    		height: 300 * (timeVal/38.17)
	    	},
	    	backgroundColor: 'transparent',
	    	legend: {
	    		position: 'right', //Would  the map be better with a legend?
	    		alignment: 'center'
	    	},
	    	pieSliceText: 'value', //have slice mouseover show the value of each category
	    	slices: { //set slice color same as the map
	        0: { color: '#f0cc67' },
	        1: { color: '#e89f67' },
	        2: { color: '#a3c978'},
	        3: { color: '#76c4ad'},
	        4: { color: '#f07eb8'},
	        5: { color: '#bdbdbd'}
	      }
	    };
	    chart = new google.visualization.PieChart(document.getElementById("pieCanvas"));
	    chart.draw(data, options);
	};
};

//function to identify if a city is displayed in the panel, and to update date the piechart with the year change if so.
function currentCity(map,legendText) {
	map.eachLayer(function(layer) {
		//identify the current city (panelName) and year (temporalLegend)
		var panelName = document.getElementById("panelName");
		var currentYear = document.getElementById("temporalLegend").textContent.substr(0,4);
		//find the feature with the city name that matches the city being displayed, if a pie chart is being displayed
		try{
			if (layer.feature.properties.City === panelName.textContent) {
				//using the temporal legend as an anchor, build a key to call from the feature, returning values for the piechart function to update to the year
				var drive = currentYear + " Drive";
				var driveVal = Number(layer.feature.properties[drive]);
				var pubTrans = currentYear + " Public Transportation";
				var pubTransVal = Number(layer.feature.properties[pubTrans]);
				var walk = currentYear + " Walked";
				var walkVal = Number(layer.feature.properties[walk]);
				var bike = currentYear + " Biked";
				var bikeVal = Number(layer.feature.properties[bike]);
				var other = currentYear + " Taxi, Motorcycle, Other";
				var otherVal = Number(layer.feature.properties[other]);
				var home = currentYear + " Worked From Home";
				var homeVal = Number(layer.feature.properties[home]);
				var time = currentYear + " Commute Time";
				var timeVal = Number(layer.feature.properties[time]);
				//rebuild the panel content
				var panelContent = "<p>Average " + time + ": " + timeVal + " minutes</p>";
				$("#panel").html(panelContent);
				$("#pieCanvas").empty();
				//create a pie chart with the new values!
				pieChart(drive,driveVal,pubTrans,pubTransVal,walk,walkVal,bike,bikeVal,other,otherVal,home,homeVal,timeVal);
			};
		} catch(err) {};
	});
};

$(document).ready(loadmap);