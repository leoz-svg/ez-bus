import random

from Bus import Bus


class BusRoute:
    def __init__(self, route, bus_number):
        self.bus_number = bus_number
        self.route = route
        self.buses = []

    def get_buses(self):
        return self.buses

    def get_route(self):
        return self.route

    def add_bus(self):
        if len(self.route) >= len(self.buses) + 1:
            while True:
                position = random.randint(0, len(self.route) - 1)
                if not any(bus.get_position() == position for bus in self.buses):
                    bus = Bus(position)
                    self.buses.append(bus)
                    break
            return bus
        return None

    def abstract_bus(self):
        if len(self.buses) >= 1:
            bus = random.choice(self.buses)
            self.buses.remove(bus)
            return bus
        return None
