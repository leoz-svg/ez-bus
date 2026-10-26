import csv
import random

from Entity import Entity
from Person import Person
from BusRoute import BusRoute

ROAD_MAX_PEOPLE = 80
JIM = 70


class Map:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.persons = []
        self.grid = [[Entity() for _ in range(height)] for _ in range(width)]
        self.bus_routes = []
        self.bus_station = []

    def load(self, road, bus_route, bus_station):
        for coordinate in road:
            self.grid[coordinate[0]][coordinate[1]] = Entity('R')

        for bus_single_station in bus_station:
            self.grid[bus_single_station[0]][bus_single_station[1]] = Entity('BS')
        self.bus_station = bus_station

        for route in bus_route:
            for route_coordinate in route[1]:
                facility = self.grid[route_coordinate[0]][route_coordinate[1]].get_facility()
                if facility == 'R' or facility == 'H':
                    self.grid[route_coordinate[0]][route_coordinate[1]] = Entity('BR')

            bus_route = BusRoute(route[1], route[0])
            self.bus_routes.append(bus_route)
            self.route_add_bus(route[0])

        with open("render.csv", mode='w', newline='') as people_file:
            people_csv_writer = csv.writer(people_file)
            for i in range(self.width):
                row = []
                for j in range(self.height):
                    row.append(self.grid[i][j].get_facility())
                people_csv_writer.writerow(row)

    def random_people(self, number, departures, destinations):
        for i in range(number):
            departure = random.choice(departures)
            destination = random.choice(destinations)
            person = Person(departure, destination, departure)
            self.persons.append(person)
            self.grid[person.get_x()][person.get_y()].add_person_number(1)

    def people_grid_coordinate(self):
        coordinate_list = []
        for row in range(self.width):
            for col in range(self.height):
                number = self.grid[row][col].get_person_number()
                if number != 0:
                    coordinate_list.append((row, col, number))
        return coordinate_list

    def bus_grid_coordinate(self):
        coordinate_list = []
        for row in range(self.width):
            for col in range(self.height):
                number = self.grid[row][col].get_bus_number()
                if number != 0:
                    coordinate_list.append((row, col, number))
        return coordinate_list

    def update_people(self):
        new_persons = []
        for person in self.persons:
            x, y = person.get_x(), person.get_y()
            if self.grid[x][y].get_facility() == 'BS':
                if self.grid[x][y].get_bus_number() == 0:
                    new_persons.append(person)
                    continue
                self.grid[x][y].subtract_person_number(1)
                continue
            dx = person.get_destination()[0] - x
            dy = person.get_destination()[1] - y
            new_x, new_y = x, y
            for attempt in range(64):
                if random.random() < 0.6:  # 60% chance to move in the x direction
                    new_x = x + (1 if dx > 0 else -1 if dx < 0 else 0)
                else:
                    new_x = x
                if random.random() < 0.6:  # 60% chance to move in the y direction
                    new_y = y + (1 if dy > 0 else -1 if dy < 0 else 0)
                else:
                    new_y = y
                if not (0 <= new_x < self.width and 0 <= new_y < self.height):
                    continue
                facility = self.grid[new_x][new_y].get_facility()
                if 0 <= new_x < self.width and 0 <= new_y < self.height \
                        and (facility == 'R' or facility == 'BS' or facility == 'BR'):
                    break
            else:
                new_x, new_y = x, y  # Bounded retry: stay put when blocked.
            current_entity = self.grid[x][y]
            next_entity = self.grid[new_x][new_y]

            if next_entity.get_person_number() < ROAD_MAX_PEOPLE:
                current_entity.subtract_person_number(1)
                next_entity.add_person_number(1)
                person.update_position(new_x, new_y)
            new_persons.append(person)
        self.persons = new_persons


    def update_bus(self):
        for route in self.bus_routes:
            for bus in route.get_buses():
                position = route.get_route()[bus.get_position()]
                self.grid[position[0]][position[1]].remove_bus()
                index = bus.get_position() + 1
                if index > len(route.get_route()) - 1:
                    index = 0
                bus.change_position(index)
                new_position = route.get_route()[index]
                self.grid[new_position[0]][new_position[1]].add_bus()

    def route_add_bus(self, bus_number):
        for route in self.bus_routes:
            if route.bus_number == bus_number:
                bus = route.add_bus()
                if bus is None:
                    raise ValueError("Route has no free bus position")
                position = route.get_route()[bus.get_position()]
                self.grid[position[0]][position[1]].add_bus()

    def route_minus_bus(self, bus_number):
        for route in self.bus_routes:
            if route.bus_number == bus_number:
                bus = route.abstract_bus()
                if bus is None:
                    raise ValueError("Cannot remove a bus from an empty route")
                position = route.get_route()[bus.get_position()]
                self.grid[position[0]][position[1]].remove_bus()

    def raise_bus_route(self):
        for row in range(1, self.width - 1):
            for col in range(1, self.height - 1):
                if self.grid[row][col].get_person_number() > JIM:
                    is_jam = True
                    for i in range(-1, 2):
                        for j in range(-1, 2):
                            entity = self.grid[row + i][col + j]
                            facility = entity.get_facility()
                            if (facility == 'R' or facility == 'BR' or facility == 'BS') and \
                                    entity.get_person_number() <= JIM:
                                is_jam = False
                    if is_jam:
                        new_route = self.create_new_route(row, col)
                        if new_route:
                            bus_route = BusRoute(new_route, None)
                            self.bus_routes.append(bus_route)
                            self.route_add_bus(None)
                            self.grid[row][col].add_bus_station()
                            return new_route
        return

    def create_new_route(self, row, col):
        def is_valid(x, y):
            return 0 <= x < self.width and 0 <= y < self.height

        def dfs(x, y, goal_x, goal_y, path, visited):
            # Iterative first-found DFS, not a shortest-path guarantee.
            stack = [(x, y)]
            parents = {(x, y): None}
            directions = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (-1, 1), (1, -1)]
            while stack:
                current = stack.pop()
                if current == (goal_x, goal_y):
                    trail = []
                    while current is not None:
                        trail.append(current)
                        current = parents[current]
                    path.extend(reversed(trail))
                    return True
                visited.add(current)
                for dx, dy in reversed(directions):
                    nxt = (current[0] + dx, current[1] + dy)
                    if is_valid(*nxt) and self.grid[nxt[0]][nxt[1]].get_facility() != 'H' and nxt not in parents:
                        parents[nxt] = current
                        stack.append(nxt)
            return False

        shortest_route = []
        shortest_route_length = float('inf')
        for station_1 in self.bus_station:
            for station_2 in self.bus_station:
                if station_1 == station_2:
                    continue
                station_1_x, station_1_y = station_1
                station_2_x, station_2_y = station_2

                path_1 = []
                visited_1 = set()
                if dfs(station_1_x, station_1_y, row, col, path_1, visited_1):
                    path_2 = []
                    visited_2 = set()
                    if dfs(row, col, station_2_x, station_2_y, path_2, visited_2):
                        combined_route = path_1 + path_2[1:]
                        route_length = len(combined_route)
                        if route_length < shortest_route_length:
                            shortest_route = combined_route
                            shortest_route_length = route_length

        return shortest_route


