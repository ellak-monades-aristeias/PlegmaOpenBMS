$(function () {

    var d1, data, chartOptions;

    d1 = [
        [1262304000000, 6], [1264982400000, 2057], [1267401600000, 2043], [1270080000000, 2198], 
        [1272672000000, 2660], [1275350400000, 1826], [1277942400000, 1302], [1280620800000, 2237], 
        [1283299200000, 2004], [1285891200000, 2144], [1288569600000, 1577], [1291161600000, 1295]
    ];
 
   data = [{ 
        label: "Total clicks", 
        data: d1, 
        color: '#f0ad4e' 
    }]; 

    chartOptions = {
        xaxis: {
            min: (new Date(2009, 12, 1)).getTime(),
            max: (new Date(2010, 11, 2)).getTime(),
            mode: "time",
            tickSize: [2, "month"],
            monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            tickLength: 0
        },
        yaxis: {

        },
        series: {
            lines: {
                show: true, 
                fill: true,
                fillColor: { colors: [ { opacity: 0.5 }, { opacity: 0.2 } ] },
                lineWidth: 1.5
            },
            points: {
                show: true,
                radius: 2.5,
                fill: true,
                fillColor: "#ffffff",
                lineWidth: 1.1
            }
        },
       grid: { 
            hoverable: true, 
            clickable: false, 
            borderWidth: 0 
        },
        legend: {
            show: false
        },
        
        tooltip: true,

        tooltipOpts: {
            content: '%s: %y'
        }
    };


    

    var holder = $('#chart3');

    if (holder.length) {
        $.plot(holder, data, chartOptions );
    }



});