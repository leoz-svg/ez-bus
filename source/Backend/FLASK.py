"""Local teaching server; not an authenticated public fleet-control service.

Portfolio maintenance: same-origin static files, consistent snapshots, locked
simulation mutations, validated commands and one worker without debug reloader.
"""
import os
import json
import threading
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from Main import Main, MAX_PEOPLE, INTERVAL, SPEED_MUL, transform_grid_to_real_coordinate

BASE = Path(__file__).resolve().parent
os.chdir(BASE)
FRONTEND = BASE.parent / 'front end'
app = Flask(__name__, static_folder=str(FRONTEND), static_url_path='')
socketio = SocketIO(app, async_mode='threading')
lock = threading.RLock()
main = Main()
main.load_map()
tick = 0
generated = 0
MAX_GENERATED = 10000
MAX_ROUTE_BUSES = 30

def snapshot():
    """Read memory, avoiding CSV races and mixed object/array formats."""
    return {
        'people': transform_grid_to_real_coordinate(main.city_map.people_grid_coordinate()),
        'bus': transform_grid_to_real_coordinate(main.city_map.bus_grid_coordinate()),
    }

@app.get('/')
def index():
    return send_from_directory(FRONTEND, 'login.html')

@app.get('/get_max_people')
def get_max_people():
    return jsonify(max_people=MAX_PEOPLE)

@app.get('/health')
def health():
    with lock:
        return jsonify(status='ok', mode='academic-simulation', tick=tick,
                       people=len(main.city_map.persons), generated=generated)

@socketio.on('connect')
def connect():
    with lock:
        emit('data_updated', json.dumps(snapshot()))

def validated_route(route_number):
    if type(route_number) is not int or route_number not in (61, 412, 475):
        raise ValueError('Select route 61, 412 or 475.')
    return next(r for r in main.city_map.bus_routes if r.bus_number == route_number)

def mutate(success, error, action, value=None):
    try:
        with lock:
            result = action(value)
            socketio.emit(success, {'route_number': value, 'result': result})
            socketio.emit('data_updated', json.dumps(snapshot()))
        return {'ok': True}
    except ValueError as exc:
        emit(error, str(exc))
        return {'ok': False, 'error': str(exc)}

def add_bus(route_number):
    route = validated_route(route_number)
    if len(route.buses) >= MAX_ROUTE_BUSES:
        raise ValueError('Teaching scenario limit: 30 buses per route.')
    main.add_bus_to_route(route_number)
    return len(route.buses)

def drop_bus(route_number):
    route = validated_route(route_number)
    if not route.buses:
        raise ValueError('This route already has zero buses.')
    main.minus_bus_to_route(route_number)
    return len(route.buses)

def add_people(_):
    global generated
    if generated + 30 > MAX_GENERATED:
        raise ValueError('Teaching scenario limit reached; restart the local server.')
    main.raise_people()
    generated += 30
    return 30

def add_route(_):
    if len(main.city_map.bus_routes) >= 4:
        raise ValueError('Only one experimental extra route is allowed per run.')
    return main.add_route() or 'No new route suggested'

@socketio.on('add_bus')
def handle_add_bus(value):
    return mutate('bus_added', 'add_bus_error', add_bus, value)

@socketio.on('drop_bus')
def handle_drop_bus(value):
    return mutate('bus_dropped', 'drop_bus_error', drop_bus, value)

@socketio.on('raise_people')
def handle_raise_people():
    return mutate('people_added', 'add_people_error', add_people)

@socketio.on('add_new_route')
def handle_add_route():
    return mutate('route_added', 'add_route_error', add_route)

def step():
    global tick
    with lock:
        if tick < MAX_PEOPLE / 30 and generated + 30 <= MAX_GENERATED:
            add_people(None)
        main.city_map.update_bus()
        if tick % SPEED_MUL == 0:
            main.city_map.update_people()
        tick += 1
        return snapshot()

def run_simulation():
    for _ in range(4000):
        socketio.emit('data_updated', json.dumps(step()))
        socketio.sleep(INTERVAL)

if __name__ == '__main__':
    socketio.start_background_task(run_simulation)
    socketio.run(app, host='127.0.0.1', port=5000, debug=False,
                 use_reloader=False, allow_unsafe_werkzeug=True)
