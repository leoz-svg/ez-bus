"""Run from repo root: python -m unittest discover -s tests -p 'test_*.py'."""
import sys
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'source/Backend'))
import FLASK as server

class BackendTests(unittest.TestCase):
    def setUp(self):
        server.main = server.Main()
        server.main.load_map()
        server.tick = 0
        server.generated = 0
        self.client = server.socketio.test_client(server.app)

    def tearDown(self):
        self.client.disconnect()

    def test_static_and_initial_socket_snapshot(self):
        http = server.app.test_client()
        for path in ['/', '/index.html', '/javascript/app.js', '/coordinates_61.csv', '/health']:
            response = http.get(path)
            self.assertEqual(response.status_code, 200, path)
            response.close()
        payload = self.client.get_received()[0]
        data = json.loads(payload['args'][0])
        self.assertEqual(data['people'], [])
        self.assertIsInstance(data['bus'], list)
        self.assertEqual(sum(p[2] for p in data['bus']), 3)

    def test_commands_and_boundaries(self):
        self.client.get_received()
        self.assertTrue(self.client.emit('add_bus', 61, callback=True)['ok'])
        self.assertEqual(len(server.validated_route(61).buses), 2)
        self.assertFalse(self.client.emit('add_bus', '61', callback=True)['ok'])
        self.assertFalse(self.client.emit('add_bus', 999, callback=True)['ok'])
        self.assertTrue(self.client.emit('drop_bus', 412, callback=True)['ok'])
        self.assertFalse(self.client.emit('drop_bus', 412, callback=True)['ok'])
        self.assertTrue(self.client.emit('raise_people', callback=True)['ok'])
        self.assertEqual(server.generated, 30)
        self.assertEqual(len(server.main.city_map.persons), 30)
        self.assertTrue(self.client.emit('add_new_route', callback=True)['ok'])
        self.assertEqual(len(server.main.city_map.bus_routes), 3)

    def test_snapshot_consistency_over_time(self):
        for i in range(500):
            d = server.step()
            self.assertEqual(sum(p[2] for p in d['people']), len(server.main.city_map.persons))
            self.assertEqual(sum(b[2] for b in d['bus']), 3)
            self.assertTrue(all(b[2] >= 0 for b in d['bus']))
            self.assertTrue(all(0 <= p.get_x() < 100 and 0 <= p.get_y() < 100 for p in server.main.city_map.persons))
        self.assertEqual(server.generated, 2010)
        self.assertLessEqual(len(server.main.city_map.persons), server.generated)

    def test_experimental_path_uses_traversable_cells(self):
        path = server.main.city_map.create_new_route(31, 64)
        self.assertTrue(path)
        self.assertTrue(all(server.main.city_map.grid[x][y].get_facility() != 'H' for x,y in path))
        for a,b in zip(path,path[1:]):
            self.assertLessEqual(max(abs(a[0]-b[0]),abs(a[1]-b[1])), 1)

if __name__ == '__main__':
    unittest.main()
