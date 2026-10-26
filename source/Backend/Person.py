class Person:
    def __init__(self, departure, destination, current):
        self.departure = departure
        self.destination = destination
        self.current = current

    def get_x(self):
        return self.current[0]

    def get_y(self):
        return self.current[1]

    def get_current(self):
        return self.current

    def get_departure(self):
        return self.departure

    def get_destination(self):
        return self.destination

    def update_position(self, x, y):
        self.current = (x, y)





