class Entity:
    def __init__(self, facility='H'):
        self.person_number = 0
        self.facility = facility
        self.buses = 0

    def get_facility(self):
        return self.facility

    def get_person_number(self):
        return self.person_number

    def add_person_number(self, number):
        self.person_number += number

    def subtract_person_number(self, number):
        self.person_number -= number

    def get_bus_number(self):
        return self.buses

    def add_bus(self):
        self.buses += 1

    def remove_bus(self):
        self.buses -= 1

    def add_bus_station(self):
        self.facility = 'BS'
