function readerPieChart(
  params = {
    data: [],
    title: "",
    subtitle: "",
    dom: null,
  }
) {
  const option = {
    title: {
      text: params.title,
      subtext: params.subtitle,
      left: "left",
    },
    tooltip: {
      trigger: "item",
    },
    legend: {
      orient: "vertical",
      left: "right",
      itemWidth: 30,
      itemHeight: 20,
      textStyle: {
        fontSize: 14,
        fontWeight: "bold ",
      },
    },
    series: [
      {
        name: params.subtitle,
        type: "pie",
        radius: "50%",
        data: params.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
  const chartDom = document.getElementById(params.dom);
  const myChart = echarts.init(chartDom);
  window.addEventListener("resize", function () {
    myChart.resize();
  });
  myChart.setOption(option);
}

function renderBarChart(
  params = {
    data: [],
    title: "",
    subtitle: "",
    dom: null,
  }
) {
  const option = {
    tooltip: {
      trigger: "item",
    },
    xAxis: {
      type: "value",
    },

    legend: {
      orient: "vertical",
      left: "left",
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: params.data.map((item) => item.name),
    },
    series: [
      {
        data: params.data.map((item) => item.value),
        type: "bar",
        realtimeSort: true,
        label: {
          show: true,
          position: "right",
          valueAnimation: true,
        },
      },
    ],
  };
  const chartDom = document.getElementById(params.dom);
  const myChart = echarts.init(chartDom);
  myChart.setOption(option);
  window.addEventListener("resize", function () {
    myChart.resize();
  });
}

function renderLineChart(
  params = {
    data: [],
    title: "",
    subtitle: "",
    dom: null,
  }
) {
  const option = {
    title: {
      text: params.title,
      subtext: params.subtitle,
      left: "center",
    },
    tooltip: {
      trigger: "item",
    },
    legend: {
      orient: "vertical",
      left: "left",
    },
    xAxis: {
      type: "category",
      data: params.data.name,
    },
    yAxis: {
      type: "value",
    },
    series: params.data.value.map((item) => {
      return {
        data: item.data,
        type: "line",
      };
    }),
  };
  const chartDom = document.getElementById(params.dom);
  const myChart = echarts.init(chartDom);
  myChart.setOption(option);
  window.addEventListener("resize", function () {
    myChart.resize();
  });
}

(function () {
  readerPieChart({
    dom: "box1",
    title: 'Current population situation',
    // subtitle: 'People Number',
    data: [
      {
        name: "Remaining umber of persons (24237)",
        value: 24237,
      },
      {
        name: "Number of departures (2378)",
        value: 2378,
      },
    ],
  });
  renderBarChart({
    dom: "box2",
    title: "Current population situation",
    subtitle: "People Number",
    data: [
      {
        name: "Bus station1",
        value: 100,
      },
      {
        name: "Bus station2",
        value: 200,
      },
      {
        name: "Bus station3",
        value: 300,
      },
      {
        name: "Bus station4",
        value: 25,
      },
    ],
  });
  renderLineChart({
    dom: "box3",
    title: "Estimated waiting time for passengers",
    // subtitle: 'People Number',
    data: {
      name: ["One", "Two", "Three", "Four", "Five"],
      value: [
        {
          name: "one",
          data: [5, 10, 15, 25, 35],
        },
        {
          name: "two",
          data: [7, 4, 10, 20, 22],
        },
        {
          name: "three",
          data: [3, 15, 6, 15, 27],
        },
        {
          name: "four",
          data: [9, 20, 13, 30, 20],
        },
      ],
    },
  });
  readerPieChart({
    dom: "box4",
    title: 'Bus Station Situation',
    // subtitle: 'People Number',
    data: [
      {
        name: "Remaining number of bus (52)",
        value: 52,
      },
      {
        name: "Number of departures (108)",
        value: 108,
      },
    ],
  });
})();
