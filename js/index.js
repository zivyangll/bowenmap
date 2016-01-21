var format = 'image/png';
var bounds = [6.41725, 51.2760181,
    11.6810616, 54.0075275];
var popup;
var init = 0;
var initSearch = 0;
var currentFeatureID;
var currentFeature;
var currentFeatureSearch;
var currentFeatureLayer;
var currentFeatureLayerSearch;

var featureStyle = {
    'MultiLineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'red',
            width: 3
        })
    })
}
var featureStyleSearch = {
    'MultiLineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'yellow',
            width: 4
        })
    })
}

var styleFunction = function (feature, resolution) {
    return featureStyle[feature.getGeometry().getType()];
};
var styleFunctionSearch = function (feature, resolution) {
    return featureStyleSearch[feature.getGeometry().getType()];
};


var waterlayer = false; // 添加图层否
var projection = new ol.proj.Projection({
    code: 'EPSG:4326',
    units: 'degrees',
    axisOrientation: 'neu'
});
var view = new ol.View({
    center: ol.proj.fromLonLat([9, 52]),
    zoom: 7,
    view: new ol.View({
        projection: projection
    })
})
var raster = new ol.layer.Tile({
    source: new ol.source.OSM()
})

var source = new ol.source.Vector({wrapX: false});

var waterSource = new ol.source.ImageWMS({
    ratio: 1,
    url: 'http://localhost:18080/geoserver/bw/wms',
    params: {'FORMAT': format,
        'VERSION': '1.1.1',
        LAYERS: 'bw:waterways',
        STYLES: ''
    }
})

var waterWMS = new ol.layer.Image({
    source: waterSource
});


var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            })
        })
    })
});


var map = new ol.Map({
    layers: [raster, vector, waterWMS],
    target: 'map',
    controls: ol.control.defaults({ attribution: false }).extend([
        new ol.control.OverviewMap({
            target: 'overmap'
        }),
        new ol.control.FullScreen({
            target: 'fullToExtent'
        }),
        new ol.control.ScaleLine({
            target: 'scaleLine'
        }),
        new ol.control.ZoomSlider(),
        new ol.control.MousePosition({
            undefinedHTML: '当前位置',
            projection: 'EPSG:4326',
            coordinateFormat: function (coordinate) {
                return ol.coordinate.format(coordinate, '{x}, {y}', 4);
            }
        })
    ]).extend([
        new ol.control.ZoomToExtent({
            extent: [
                ol.proj.fromLonLat([11.6810616, 51.2760181])[0], ol.proj.fromLonLat([11.6810616, 51.2760181])[1],
                ol.proj.fromLonLat([6.41725, 54.0075275])[0], ol.proj.fromLonLat([6.41725, 54.0075275])[1]
            ],
            target: 'zoomToExtent'
        })
    ]),
    view: view
});
console.log(ol.proj.fromLonLat([51.2760181, 6.41725]))
console.log(ol.proj.fromLonLat([54.0075275, 11.6810616]))

map.on('hover', function (evt) {
    alert("当前坐标:" + ol.proj.toLonLat(evt.coordinate))
});

var draw1; // global so we can remove it later
function addInteraction(value) {
    if (value !== 'None') {
        var geometryFunction, maxPoints;
        if (value === 'Square') {
            value = 'Circle';
            geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
        } else if (value === 'Box') {
            value = 'LineString';
            maxPoints = 2;
            geometryFunction = function (coordinates, geometry) {
                if (!geometry) {
                    geometry = new ol.geom.Polygon(null);
                }
                var start = coordinates[0];
                var end = coordinates[1];
                geometry.setCoordinates([
                    [start, [start[0], end[1]], end, [end[0], start[1]], start]
                ]);
                return geometry;
            };
        }
        draw1 = new ol.interaction.Draw({
            source: source,
            type: /** @type {ol.geom.GeometryType} */ (value),
            geometryFunction: geometryFunction,
            maxPoints: maxPoints
        });
        map.addInteraction(draw1);
    }
}


var select = null;  // ref to currently selected interaction

// select interaction working on "singleclick"
var selectSingleClick = new ol.interaction.Select();

// select interaction working on "click"
var selectClick = new ol.interaction.Select({
    condition: ol.events.condition.click
});

// select interaction working on "pointermove"
var selectPointerMove = new ol.interaction.Select({
    condition: ol.events.condition.pointerMove
});

var selectAltClick = new ol.interaction.Select({
    condition: function (mapBrowserEvent) {
        return ol.events.condition.click(mapBrowserEvent) &&
            ol.events.condition.altKeyOnly(mapBrowserEvent);
    }
});

var selectElement = document.getElementById('type');


$(document).ready(function () {
    $('#map').height(($(window).height() - 120 ) + 'px')
    $(window).resize(function () {
        $('#map').height(($(window).height() - 120 ) + 'px')
    })
    $('#type li a').click(function (e) { // 标注
        map.removeInteraction(draw1);
        addInteraction($(e.target).html());
    });

    $('#loadLayer').click(function (e) { // 加载图层
        if (waterlayer) {
            map.addLayer(waterWMS);
        } else {
            map.removeLayer(waterWMS);
        }
        waterlayer = !waterlayer;

    })

    $('#overAllMap').click(function (e) {
        var rotateLeft = ol.animation.rotate({
            duration: 2000,
            rotation: -4 * Math.PI
        });
        map.beforeRender(rotateLeft);
        map.setView(new ol.View({
            center: ol.proj.fromLonLat([9, 52]),
            zoom: 7,
            view: new ol.View({
                projection: projection
            })
        }));
    })

    map.on('singleclick', function (evt) {
        var viewResolution = (view.getResolution());
        var url = waterSource.getGetFeatureInfoUrl(
            evt.coordinate, viewResolution, 'EPSG:3857',
            {'INFO_FORMAT': 'application/json'});
        if (url) {
            $.get(url, function (data) {
                if ((JSON.stringify(data).length) > 80) {
                    currentFeature = data;
                    var feature = data.features[0];
                    $('#contentID').html(feature.id);
                    $('#contentName').html(feature.properties.name);
                    $('#contentType').html(feature.properties.type);
                    $('#contentGeoType').html(feature.geometry.type);
                    $('#contentOSMID').html(feature.properties.osm_id);
                    currentFeatureID = feature.properties.osm_id;
                    popup = $('#attrPop').bPopup({
                        follow: [true, true],
                        modalClose: false,
                        opacity: 0.6
                    });
                }
            })
        }
    });

    $('#attrPop .title img').click(function () {
        popup.close();
    })

    $('#showFeature').click(function () {
        if (init > 0) {
            map.removeLayer(currentFeatureLayer);
        }
        var coordinate = [0, 0];
        for (var i = 0; i < currentFeature.features[0].geometry.coordinates[0].length; i++) {
            currentFeature.features[0].geometry.coordinates[0][i] = ol.proj.fromLonLat(currentFeature.features[0].geometry.coordinates[0][i]);
            coordinate[0] += currentFeature.features[0].geometry.coordinates[0][i][0];
            coordinate[1] += currentFeature.features[0].geometry.coordinates[0][i][1];
        }
        coordinate[0] = coordinate[0] / currentFeature.features[0].geometry.coordinates[0].length
        coordinate[1] = coordinate[1] / currentFeature.features[0].geometry.coordinates[0].length
        var vectorSource = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(currentFeature)
        });

        currentFeatureLayer = new ol.layer.Vector({
            source: vectorSource,
            style: styleFunction
        });
        map.addLayer(currentFeatureLayer);
        init++;
        popup.close();

        map.setView(new ol.View({
            center: coordinate,
            zoom: 13,
            view: new ol.View({
                projection: projection
            })
        }));
        var pan = ol.animation.pan({
            duration: 2000,
            source: /** @type {ol.Coordinate} */ (view.getCenter())
        });
        map.beforeRender(pan);

    })
    map.on('pointermove', function (evt) {
        if (evt.dragging) {
            return;
        }
        var pixel = map.getEventPixel(evt.originalEvent);
        var hit = map.forEachLayerAtPixel(pixel, function (layer) {
            return true;
        });
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    $('#searchButton').click(function () {
        var value = $('#searchInput').val();
        if (value.length > 0) {
//            var currentFeatureSearch = {"st_asgeojson": "{\"type\":\"MultiLineString\",\"coordinates\":[[[9.1217162,52.8575098],[9.1226053,52.860346],[9.1226601,52.8605265],[9.1231316,52.8630969],[9.1230855,52.863227],[9.1229701,52.863278],[9.1209162,52.8632548],[9.1206547,52.8632409],[9.1200967,52.8632445],[9.1169855,52.8635381],[9.1149316,52.8637332],[9.111547,52.8633198],[9.1097932,52.8631201],[9.1096498,52.8632003],[9.1027224,52.880206],[9.102686,52.8802978],[9.1015461,52.8826996],[9.1015423,52.8829283],[9.1015008,52.8872819],[9.1031153,52.8890774],[9.1031882,52.8891598],[9.1106385,52.8973246],[9.1107291,52.8975444],[9.1115683,52.8999034]]]}"};
            $.get('http://localhost:5000/?id=' + value, function (currentFeatureSearch) {
//                currentFeatureSearch = JSON.parse(currentFeatureSearch);
                currentFeatureSearch = JSON.parse(currentFeatureSearch.st_asgeojson.toString());
                console.log(currentFeatureSearch)
                if (initSearch > 0) {
                    map.removeLayer(currentFeatureLayerSearch);
                }
                var coordinate = [0, 0];
                for (var i = 0; i < currentFeatureSearch.coordinates[0].length; i++) {
                    currentFeatureSearch.coordinates[0][i] = ol.proj.fromLonLat(currentFeatureSearch.coordinates[0][i]);
                    coordinate[0] += currentFeatureSearch.coordinates[0][i][0];
                    coordinate[1] += currentFeatureSearch.coordinates[0][i][1];
                }
                coordinate[0] = coordinate[0] / currentFeatureSearch.coordinates[0].length;
                coordinate[1] = coordinate[1] / currentFeatureSearch.coordinates[0].length;
                tempdata.features[0].geometry = currentFeatureSearch;
                currentFeatureSearch = tempdata;
                var vectorSource = new ol.source.Vector({
                    features: (new ol.format.GeoJSON()).readFeatures(currentFeatureSearch)
                });

                currentFeatureLayerSearch = new ol.layer.Vector({
                    source: vectorSource,
                    style: styleFunctionSearch
                });
                map.addLayer(currentFeatureLayerSearch);
                initSearch++;

                map.setView(new ol.View({
                    center: coordinate,
                    zoom: 13,
                    view: new ol.View({
                        projection: projection
                    })
                }));
                var pan = ol.animation.pan({
                    duration: 2000,
                    source: (view.getCenter())
                });
                map.beforeRender(pan);
            })
        } else {
            alert('Please Input OSM_ID!')
        }
    })
})