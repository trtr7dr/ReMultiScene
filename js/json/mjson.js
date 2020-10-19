
var json = {
    "scene1": {
        "gltf": "zuu/zzu", 
        "perspective": 90, //перспектива камеры
        "background": "black",
        "ambient": "rgb(255, 0, 0)",
        'post': '',
        'start_position': {
            "x": 1500,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(255, 255, 255)",
            'color': "rgb(255, 0, 0)",
            'power': 2
        },
        "path": {
            "0": [1000, 65, 0],
            "1": [500, 50, 5],
            "2": [300, 20, 30],
            "3": [150, 30, 20],
            "4": [0, 0, 0],
            "5": [-500, 0, 0],
            "6": [-5000, 10, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': true, // автоматическая или при прокрутке
        "extra_func": [
                // доп функции. Необходимо добавить проверку в классе MultiScene
        ],
        "css": {
            "filter": "none" 
        },
        "amsterdam": false, // автоматически включать AfterimagePass
        "debug": false, // рисовать маршрут движения камеры
        'speed': 10
    },
    
    "scene2": {
        "gltf": "tun/tun",
        "perspective": 90,
        "background": "black",
        "ambient": "rgb(0, 255, 0)",
        'post': '',
        'start_position': {
            "x": 1000,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(255, 255, 255)",
            'color': "rgb(255, 0, 0)",
            'power': 2
        },
        "path": {
            "0": [1000, 65, 0],
            "1": [800, 0, 15],
            "2": [700, 0, 0],
            "3": [150, 0, 0],
            "4": [0, 0, 0],
            "5": [-500, 0, 0],
            "6": [-5000, 10, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': true,
        "extra_func": [
        ],
        "css": {
            "filter": "none" 
        },
        "amsterdam": true,
        "debug": false,
        'speed': 10
    }
};