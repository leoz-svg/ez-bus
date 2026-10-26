let myLerp = lerp;
let myMap;
let markers = [];
let simulationRunning = false;
let heatLayer;
const heatData = []; // store heatmap data point
let MAX_PEOPLE = 2000; // default

let proportionArea1 = 14 / 30; // initial proportion，used for bus people proportion
let proportionArea3 = 14 / 30;


//Track the number of people in the previous frame and the current frame
let previousPeopleCount = 0; // previous total people
let accumulatedDifference = 0; // accumulated difference

let pieChart;  // global variable for pieChart


let bus61_count = 1;
let bus412_count = 1;
let bus475_count = 1;

let departed_bus_count = bus61_count + bus412_count + bus475_count;
let remain_available = 90 - departed_bus_count



const routes = [
    { filePath: 'coordinates_61.csv', color: 'blue' },
    { filePath: 'coordinates_412.csv', color: 'red' },
    { filePath: 'coordinates_475.csv', color: '#789262' }
];

// Step 1: Define a custom icon
const customIcon = L.icon({
    iconUrl: 'icon/bus_icon_2.png', // Sample icon URL, can replace it with our own icon URL
    iconSize: [30, 30], // can adjust these values as needed
    iconAnchor: [11, 6], // Make sure the icon is fixed correctly in its position
    popupAnchor: [-3, -76]
});

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function setup() {
    myMap = L.map('map').setView([-27.469803, 153.00463200000002], 16);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(myMap);



    const socket = io();

    document.getElementById('toggleSimulation').addEventListener('click', function() {
        simulationRunning = !simulationRunning;
        if (simulationRunning) {
            startSimulation(socket);
            this.innerText = "Pause display";
        } else {
            pauseSimulation(socket);
            this.innerText = "Resume display";
        }
    });


    document.getElementById('toggleSimulation1').addEventListener('click', function() {

        socket.emit('raise_people')
    });



    //Load bus route CSV
   routes.forEach(route => {
       loadCSV(route.filePath, (data) => handleCSVData(data, route.color));
   });

    // Surface backend validation failures instead of silently accepting commands.
    ['add_bus_error', 'drop_bus_error', 'add_route_error', 'add_people_error'].forEach(event => {
        socket.on(event, message => alert(message));
    });
    socket.on('route_added', payload => {
        if (Array.isArray(payload.result) && payload.result.length) {
            L.polyline(payload.result, {color: '#b55cbd', dashArray: '5 5'}).addTo(myMap);
        } else alert('No new route suggested in this state.');
    });
    //Add or subtract bus routes
    document.getElementById('addBusButton').addEventListener('click', function() {
        var routeSelect = document.getElementById('routeSelect');
                var selectedRoute = routeSelect.options[routeSelect.selectedIndex].value;

                // Parse the selected line number into an integer
                selectedRoute = parseInt(selectedRoute);
                if (selectedRoute === 61) {
                    if (bus61_count < 30) {
                        bus61_count += 1
                        socket.emit('add_bus', selectedRoute);

                        updateBarChart1();
                        updateBarChart2();
                    }

                } else if (selectedRoute === 412) {
                    if (bus412_count < 30) {
                        bus412_count += 1
                        socket.emit('add_bus', selectedRoute);

                        updateBarChart1();
                        updateBarChart2();
                    }
                } else if (selectedRoute === 475) {
                    if (bus475_count < 30) {
                        bus475_count += 1
                        socket.emit('add_bus', selectedRoute);

                        updateBarChart1();
                        updateBarChart2();
                    }
                }

        //Listen button times
        adjustProportion("add");
    });

    document.getElementById('decreaseButton').addEventListener('click', function() {
        var routeSelect = document.getElementById('routeSelect');
        var selectedRoute = routeSelect.options[routeSelect.selectedIndex].value;
               // Parse the selected line number into an integer
                selectedRoute = parseInt(selectedRoute);
                if (selectedRoute === 61) {
                    if (bus61_count === 0) {
                        bus61_count = 0;
                    } else {
                        bus61_count -= 1
                        socket.emit('drop_bus', selectedRoute);

                        updateBarChart1();
                        updateBarChart2();
                    }

                } else if (selectedRoute === 412) {
                    if (bus412_count === 0) {
                        bus412_count = 0;
                    } else {
                        bus412_count -= 1
                        socket.emit('drop_bus', selectedRoute);

                        updateBarChart1();
                        updateBarChart2();
                    }


                } else if (selectedRoute === 475) {
                    if (bus475_count === 0) {
                        bus475_count = 0;
                    } else {
                        bus475_count -= 1
                        socket.emit('drop_bus', selectedRoute);

                        updateBarChart1()
                        updateBarChart2();
                    }


                }

        //Listen button times
        adjustProportion("decrease");
    });

    document.getElementById('addRouteButton').addEventListener('click', function() {

        // Send a request to the server to add a bus
        socket.emit('add_new_route');
        // Send a message to the server to rerun the simulation
        //socket.emit('restart_simulation');
    });

     // Get the value of MAX_PEOPLE
        fetch('/get_max_people')
        .then(response => response.json())
        .then(data => {
            MAX_PEOPLE = data.max_people;
             // Start listening for simulation or other initialization operations
             // Charts are initialized below; no undefined callback is needed.

        });


    // Initialize the pie chart (may need to change the selector to match your HTML element)
        const ctx = document.getElementById('myPieChart').getContext('2d');
            pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ["Total population", "People Leaving Amount"],
                    datasets: [{
                        data: [MAX_PEOPLE, 0],
                        backgroundColor: ['#cac9be','#78837E']
                    }]
                },
                options:{
                    plugins:{
                        title:{
                            display:true,
                            text:'TOTAL POPULATION',
                            padding:{
                                top:10,
                                bottom:10
                            }
                        },
                        legend:{
                            position:'bottom',
                            align:'end'
                        }
                    }
                }
            });

        const secondCtx = document.getElementById('mySecondPieChart').getContext('2d');
            secondPieChart = new Chart(secondCtx, {
                type: 'pie',
                data: {
                    labels: ["route475", "route61/475", "route61"],
                    datasets: [{
                        data: [14, 2, 14],
                        backgroundColor: ['#789262', '#d4d4d4', 'blue']
                    }]
                },
                options:{
                    plugins:{
                        title:{
                            display:true,
                            text:'Bus stop population',
                            padding:{
                                top:10,
                                bottom:10
                            }
                        },
                        legend:{
                            position:'bottom',
                            align:'end'
                        }
                    }
                }
            });


        const barCtx = document.getElementById('myBarChart1').getContext('2d');
            barChart1 = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Bus 61', 'Bus 412', 'Bus 475'],
                    datasets: [{
                        label: 'Bus Count',
                        data: [bus61_count, bus412_count, bus475_count],
                        backgroundColor: ['blue', 'red', '#789262'],
                        barThickness: 30
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Bus Count per Route',
                            padding: {
                                top: 10,
                                bottom: 10
                            }
                        },
                        legend: {
                            position: 'bottom',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

        const btx1 = document.getElementById('myBarChart2').getContext('2d');
                barChart2 = new Chart(btx1, {
                    type: 'bar',
                    data: {
                        labels: ['Departed bus num', 'Remaining bus num'],
                        datasets: [
                            {
                                label: 'Total Bus Count',
                                data: [departed_bus_count, remain_available],
                                backgroundColor: ['#9F5F9F','#92b3a5'],
                                barThickness: 30
                            }
                        ]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Total Bus',
                                padding: {
                                    top: 10,
                                    bottom: 10
                                }
                            },
                            legend: {
                                position: 'bottom',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });




}
function startSimulation(socket) {
    socket.on('data_updated', handleDataUpdated);
}

function pauseSimulation(socket) {
    socket.off('data_updated', handleDataUpdated);
}

function handleDataUpdated(data) {
    console.log('Data Updated:', data);

    // Remove old markup
    markers.forEach(marker => {
        myMap.removeLayer(marker);
    });
    markers = [];

    // Remove old heat layer
    if (heatLayer) {
        myMap.removeLayer(heatLayer);
        heatData.length = 0; // Clear data point array
    }

    let parsedData;
    try {
        parsedData = JSON.parse(data);
        if (!parsedData.people || !parsedData.bus) {
            throw new Error('Data does not contain expected properties (people, bus)');
        }
    } catch (error) {
        console.error('Error parsing data:', error);
        return;
    }

    updateHeatMap(parsedData.people);

    const busArray = transformData(parsedData.bus);

    console.log(`Adding ${busArray.length} new markers for bus...`);
    busArray.forEach(point => {
        if (Array.isArray(point) && point.length === 3) {
            // Step 2: When adding a marker, use this custom icon
            const marker = L.marker([point[0], point[1]], {icon: customIcon}).addTo(myMap);
            markers.push(marker);
        } else {
            console.error('Invalid point data:', point);
        }
    });

     // Calculate the current total number of people
     const currentPeopleCount = calculateTotalCount(parsedData.people);

        // Calculate the difference from last time
     const differenceCount = currentPeopleCount - previousPeopleCount;

        // accumulated Difference
     accumulatedDifference += differenceCount;

        // Update the last total to the current total
     previousPeopleCount = currentPeopleCount;

     // Update pie chart with accumulated differences
     updatePieChart(currentPeopleCount, accumulatedDifference);

      // Use the count value of people to assign a numerical value (number of people at the bus stop) to the new pie chart

      // Calculate using true proportions
      const baseTotal = 30;  // 14 + 2 + 14
      const baseProportion1 = 14 / baseTotal;
      const baseProportion2 = 2 / baseTotal;
      const baseProportion3 = 14 / baseTotal;

      const adjustedProportion1 = baseProportion1 * proportionArea1;
      const adjustedProportion2 = baseProportion2;  // no change
      const adjustedProportion3 = baseProportion3 * proportionArea3;

      const value1 = currentPeopleCount * adjustedProportion1;
      const value2 = currentPeopleCount * adjustedProportion2;
      const value3 = currentPeopleCount * adjustedProportion3;

      updateSecondPieChart(value1, value2, value3);



}

function updateHeatMap(peopleData) {
    const peopleArray = transformData(peopleData);
    peopleArray.forEach(point => {
        if (Array.isArray(point) && point.length === 3) {
            heatData.push([point[0], point[1], point[2]]);
        } else {
            console.error('Invalid point data:', point);
        }
    });

    heatLayer = L.heatLayer(heatData, { radius: 10 }).addTo(myMap);
}

function transformData(data) {
    if (Array.isArray(data) && data.length === 0) return [];
    if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        return data;
    } else {
        const transformedData = [];
        const keys = Object.keys(data.latitude);
        keys.forEach(key => {
            transformedData.push([
                data.latitude[key],
                data.longitude[key],
                data.count[key]
            ]);
        });
        return transformedData;
    }
}

function loadCSV(filePath, callback) {
    Papa.parse(filePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            callback(results.data);
        }
    });
}




function handleCSVData(data, color) {
    const polylinePoints = [];
    data.forEach(row => {
        if (row.latitude && row.longitude) {
            polylinePoints.push([row.latitude, row.longitude]);
        }
    });

    // 创建路线
    const polyline = L.polyline(polylinePoints, {color: color}).addTo(myMap);
     myMap.fitBounds(polyline.getBounds());  // Adjust the view to fit the route
}


//create table

function calculateTotalCount(dataArray) {
    return transformData(dataArray).reduce((sum, item) => sum + item[2], 0);
}

function updatePieChart(total, difference) {
    const bluePart = MAX_PEOPLE - total; // blue part value
    pieChart.data.datasets[0].data = [total, bluePart];
    pieChart.update();
}

function updateSecondPieChart(val1, val2, val3) {
    secondPieChart.data.datasets[0].data = [val1, val2, val3];
    secondPieChart.update();
}

function adjustProportion(action) {
    const routeSelect = document.getElementById('routeSelect');
    const selectedRoute = parseInt(routeSelect.options[routeSelect.selectedIndex].value);

    const adjustmentAmount = 1 / 30; // Adjustment amount

    switch (selectedRoute) {
        case 61: // Corresponds to area1
            if (action === "add") {
                proportionArea1 += adjustmentAmount;
            } else {
                proportionArea1 -= adjustmentAmount;
            }
            break;
        case 475: // Corresponds to area3
            if (action === "add") {
                proportionArea3 += adjustmentAmount;
            } else {
                proportionArea3 -= adjustmentAmount;
            }
            break;
    }

    // Make sure the proportion of proportionArea1 and proportionArea3 is between 0 and 1
    proportionArea1 = Math.max(0, Math.min(1, proportionArea1));
    proportionArea3 = Math.max(0, Math.min(1, proportionArea3));

    const currentPeopleCount = calculateTotalCount(heatData); // Get the current total number of people

    const value1 = Math.round(currentPeopleCount * proportionArea1);
    const value3 = Math.round(currentPeopleCount * proportionArea3);

    // Calculate value2 so that the sum is currentPeopleCount
    const value2 = currentPeopleCount - value1 - value3;  // Let value2 be to ensure that the sum of the three is currentPeopleCount
    updateSecondPieChart(value1, 2, value3); // Update pie chart
}


function updateBarChart1() {

    updateBusCounts()

    barChart1.data.datasets[0].data = [bus61_count, bus412_count, bus475_count];
    barChart1.update();

}

function updateBarChart2() {

    updateBusCounts()

    barChart2.data.datasets[0].data = [departed_bus_count, remain_available];
    barChart2.update();

}

function updateBusCounts() {
    departed_bus_count = bus61_count + bus412_count + bus475_count;
    remain_available = 90 - departed_bus_count;
}






