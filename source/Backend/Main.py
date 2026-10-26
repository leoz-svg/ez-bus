import time
import csv
global MAX_PEOPLE
from Map import Map

MAX_LATITUDE = -27.459803
MIN_LATITUDE = -27.469803
MAX_LONGITUDE = 153.014532
MIN_LONGITUDE = 153.004532

INTERVAL = 0.2
SPEED_MUL = 5
MAX_PEOPLE = 2000


def transform_real_to_grid_coordinate(latitudes, longitudes, bus_station):
    grid_coordinates = []
    for index in range(len(latitudes)):
        if MIN_LATITUDE <= latitudes[index] <= MAX_LATITUDE and MIN_LONGITUDE <= longitudes[index] <= MAX_LONGITUDE:
            grid_lat = int((latitudes[index] - MIN_LATITUDE) * 10000)
            grid_lon = int((longitudes[index] - MIN_LONGITUDE) * 10000)
            coordinate = (grid_lat, grid_lon)
            if coordinate not in grid_coordinates:
                grid_coordinates.append(coordinate)
            if bus_station is not None and coordinate in bus_station:
                for i in range(SPEED_MUL + 1):
                    grid_coordinates.append(coordinate)
    return grid_coordinates


def transform_grid_to_real_coordinate(coordinate_list):
    rows = []
    for coordinate in coordinate_list:
        latitude = coordinate[0] * 0.0001 + MIN_LATITUDE
        longitude = coordinate[1] * 0.0001 + MIN_LONGITUDE
        rows.append([latitude, longitude, coordinate[2]])
    return rows


def load_csv(file_name, bus_station):
    latitudes = []
    longitudes = []
    with open(file_name, mode='r', newline='') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            latitude = float(row['latitude'])
            longitude = float(row['longitude'])
            latitudes.append(latitude)
            longitudes.append(longitude)
    return transform_real_to_grid_coordinate(latitudes, longitudes, bus_station)


class Main:

    def __init__(self):
        self.city_map = Map(100, 100)

    def write_csv(self):
        with open("people.csv", mode='w', newline='') as people_file, open("bus.csv", mode='w', newline='') as bus_file:
            people_csv_writer = csv.writer(people_file)
            bus_csv_writer = csv.writer(bus_file)
            people_csv_rows = transform_grid_to_real_coordinate(self.city_map.people_grid_coordinate())
            bus_csv_rows = transform_grid_to_real_coordinate(self.city_map.bus_grid_coordinate())
            people_csv_writer.writerow(['latitude', 'longitude', 'count'])
            people_csv_writer.writerows(people_csv_rows)
            bus_csv_writer.writerow(['latitude', 'longitude', 'count'])
            bus_csv_writer.writerows(bus_csv_rows)



    def add_bus_to_route(self, route_number):
        self.city_map.route_add_bus(route_number)

    def minus_bus_to_route(self, route_number):
        self.city_map.route_minus_bus(route_number)

    def add_route(self):
        route = self.city_map.raise_bus_route()
        if route is not None:
            with open("new_route.csv", mode='w', newline='') as route_file:
                csv_writer = csv.writer(route_file)
                rows = []
                for coordinate in route:
                    latitude = coordinate[0] * 0.0001 + MIN_LATITUDE
                    longitude = coordinate[1] * 0.0001 + MIN_LONGITUDE
                    rows.append([latitude, longitude])
                csv_writer.writerow(['latitude', 'longitude'])
                csv_writer.writerows(rows)
            return rows

    def raise_people(self):
        departures = [(35, 48), (35, 46), (35, 47)]
        destinations = [(31, 64)]
        self.city_map.random_people(14, departures, destinations)

        departures = [(56, 40), (57, 40)]
        destinations = [(61, 71)]
        self.city_map.random_people(2, departures, destinations)

        departures = [(69, 54), (69, 55)]
        destinations = [(61, 71)]
        self.city_map.random_people(14, departures, destinations)

    def load_map(self):
        road = load_csv("road_coordinates_100X100.csv", None)
        bus_station = [(5, 53), (15, 18), (31, 64), (37, 79), (61, 71), (75, 32), (75, 38), (79, 21), (85, 2)]
        bus_61_route = load_csv("coordinates_61.csv", bus_station)
        bus_475_route = load_csv("coordinates_475.csv", bus_station)
        bus_412_route = load_csv("coordinates_412.csv", bus_station)
        bus_route = [(61, bus_61_route), (475, bus_475_route), (412, bus_412_route)]
        self.city_map.load(road, bus_route, bus_station)

    def main(self):
        for i in range(4000):
            start_time = time.time()

            if i < MAX_PEOPLE / 30:
                self.raise_people()
            self.write_csv()
            #self.add_route()

            self.city_map.update_bus()
            if i % SPEED_MUL == 0:
                self.city_map.update_people()

            end_time = time.time()

            people_csv_rows = transform_grid_to_real_coordinate(self.city_map.people_grid_coordinate())
            bus_csv_rows = transform_grid_to_real_coordinate(self.city_map.bus_grid_coordinate())

            data_for_frontend = {
                'people': people_csv_rows,
                'bus': bus_csv_rows
            }

            # Yield the data
            yield data_for_frontend

            if not self.city_map.persons:
                break

            time.sleep(max(0.0, INTERVAL - end_time + start_time))

def run_your_simulation():
    main = Main()
    main.load_map()
    sim = main.main()
    count = 0
    for data in sim:
        if count >= 100:
            break
        yield data
        count += 1


if __name__ == "__main__":
    main = Main()
    main.load_map()
    main.main()
