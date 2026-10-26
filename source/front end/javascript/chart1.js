document.addEventListener('DOMContentLoaded', function () {

    const commonOption = {
        title: {
            left: 'center',
            textStyle: {
                color: '#000',
                fontStyle: 'normal',
                fontWeight: 'bold',
                fontFamily: 'Arial',
                fontSize: 16,
            }
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            right: 10,
            bottom: 10,
            textStyle: {
                color: '#000',
                fontSize: 14,
            }
        },
        series: [{
            type: 'pie',
            radius: '60%',
            center: ['50%', '52%'],
            data: [],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                formatter: '{b} : {c} ({d}%)'
            }
        }]
    };

    const populationChart = echarts.init(document.getElementById('box1'));
    const populationOption = JSON.parse(JSON.stringify(commonOption)); 

    populationOption.title.text = 'Current Population Situation';
    populationOption.series[0].data = [
        {value: 22222, name: 'Remaining population: 22222', itemStyle: {color: 'purple'}},
        {value: 11111, name: 'Departed population: 11111', itemStyle: {color: 'yellow'}}
    ];
    populationOption.series[0].label.formatter = '{b}\nTotal: 33333'; 

    populationChart.setOption(populationOption);

    const busUsageChart = echarts.init(document.getElementById('box2'));
    const busUsageOption = JSON.parse(JSON.stringify(commonOption)); 

    busUsageOption.title.text = 'Bus Usage Situation';
    busUsageOption.series[0].data = [
        {value: 222, name: 'Remaining buses: 222', itemStyle: {color: 'purple'}},
        {value: 111, name: 'Departed buses: 111', itemStyle: {color: 'yellow'}}
    ];
    busUsageOption.series[0].label.formatter = '{b}\nTotal: 333';

    busUsageChart.setOption(busUsageOption);
});
