
var json = {
    "scene1": {
        "name": "land_squid",
        "gltf": "tst",
        "perspective": 90,
        "background": "black",
        "ambient": "rgb(255, 0, 0)",
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
        
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 250,
            "decay": 1,
            "castShadow": true
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
        'animation': false,
        "extra_func": [
            'add_center_mirror'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    "scene2": {
        "name": "land_squid",
        "gltf": "hole1",
        "perspective": 80,
        "background": "black",
        "ambient": "rgb(0, 0, 0)",
        'post': 'afterimagePass',
        'start_position': {
            "x": 1000,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(0, 0, 0)",
            'color': "rgb(255, 0, 0)",
            'power': 1
        },
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 250,
            "decay": 1,
            "castShadow": true
        },
        "path": {
            "0": [1000, 65, 0],
            "1": [500, 50, 5],
            "2": [300, 20, 30],
            "3": [150, 30, 20],
            "4": [0, 0, 0],
            "5": [-1000, 0, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': false,
        "extra_func": [
            'add_center_mirror',
            'point_massive'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    "scene3": {
        "name": "land_squid",
        "gltf": "sculpt",
        "perspective": 80,
        "background": "black",
        "ambient": "rgb(0, 0, 0)",
        'post': 'afterimagePass',
        'start_position': {
            "x": 1000,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(255, 0, 0)",
            'color': "rgb(255, 255, 255)",
            'power': 1
        },
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 250,
            "decay": 1,
            "castShadow": true
        },
        "path": {
            "0": [1000, 5, 0],
            "1": [500, 0, 5],
            "2": [300, 0, 30],
            "3": [150, 0, 20],
            "4": [0, 0, 0],
            "5": [-500, 0, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': false,
        "extra_func": [
            'add_center_mirror'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    "scene4": {
        "name": "land_squid",
        "gltf": "road",
        "perspective": 80,
        "background": "black",
        "ambient": "rgb(255, 0, 255)",
        'start_position': {
            "x": 1000,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(255, 250, 250)",
            'color': "rgb(255, 255, 255)",
            'power': 1
        },
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.15,
            "intensity": 150,
            "decay": 1,
            "castShadow": true
        },
        "path": {
            "0": [1000, 5, 0],
            "1": [0, 0, 0],
            "2": [-1500, 0, 0],
            "3": [-5000, 10, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 255)",
            "near": 10,
            "far": 1000
        },
        'animation': false,
        "extra_func": [
            'add_cube',
            'point_massive',
            'add_center_mirror'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    "scene5": {
        "name": "land_squid",
        "gltf": "zepp",
        "perspective": 90,
        "background": "black",
        "ambient": "rgb(255, 0, 0)",
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
        
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 250,
            "decay": 1,
            "castShadow": true
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
        'animation': false,
        "extra_func": [
            'add_center_mirror',
            'point_massive'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    "scene6": {
        "name": "land_squid",
        "gltf": "land",
        "perspective": 80,
        "background": "black",
        "ambient": "rgb(0, 255, 0)",
        'post': 'afterimagePass',
        'start_position': {
            "x": 1000,
            "y": 10,
            "z": 0
        },
         "light": {
            'sky': "rgb(255, 0, 0)",
            'color': "rgb(255, 0, 102)",
            'power': 5
        },
        "spot": {
            "color": "rgb(255, 255, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 5,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 250,
            "decay": 1,
            "castShadow": true
        },
        "path": {
            "0": [1000, 0, 0],
            "1": [900, 200, 0],
            "2": [700, 450, 70],
            "3": [500, 400, -70],
            "4": [200, 100, 100],
            "5": [100, 20, -33],
            "6": [0, 5, 0],
            "7": [-500, 0, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': false,
        'mirror': {
            0: {
                size: {
                    w: 550,
                    h: 550
                },
                pos: {
                    x: 500,
                    y: 150,
                    z: 200
                },
                rotate: {
                    x: 0,
                    y: 15,
                    z: 5
                }
            }
        },
        "extra_func": [
            'mirrors_custom',
            'point_massive',
            'add_center_mirror'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    },
    
    "scene7": {
        "name": "scull",
        "gltf": "house",
        "perspective": 85,
        "background": "black",
        "ambient": "rgb(0, 255, 0)",
        'post': 'afterimagePass',
        'start_position': {
            "x": 1000,
            "y": 0,
            "z": 0
        },
        "light": {
            'sky': "rgb(255, 0, 0)",
            'color': "rgb(255, 0, 102)",
            'power': 50
        },
        "spot": {
            "color": "rgb(255, 0, 255)",
            "pos-x": 5,
            "pos-y": 20,
            "pos-z": 0,
            "angle": 0.50,
            "penumbra": 0.75,
            "intensity": 1250,
            "decay": 1,
            "castShadow": true
        },
        "ray": {
            "enabled": true,
            "sun": "0x000000",
            "position": {
                "x": -1000,
                "y": 1200,
                "z": 300 
            },
            "params": {
                0: 2.0,
                1: 2.0,
                2: 3.0
            }
        },
        "path": {
            "0": [1000, 0, 0],
            "1": [750, 0, 200],
            "2": [500, 0, 400],
            "3": [0, 0, 0],
            "4": [-1000, 0, 0]
        },
        "fog": {
            "color": "rgb(0, 0, 0)",
            "near": 10,
            "far": 1300
        },
        'animation': false,
        "extra_func": [
            'add_text',
            'add_center_mirror'
        ],
        "slow_end_speed": false,
        "css": {
            "filter": "none" 
        },
        "debug": false
    }
};