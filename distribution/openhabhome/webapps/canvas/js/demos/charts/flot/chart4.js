$(function () {

    var d1, data, chartOptions;

    d1 = [
        [1262304000000, 963] , [1264982400000, 1563] , [1267401600000, 2043] , [1270080000000, 2198]
        , [1272672000000, 2660] , [1275350400000, 2782] , [1277942400000, 2430] , [1280620800000, 2427]
        , [1283299200000, 2743] , [1285891200000, 3120] , [1288569600000, 3345] , [1291161600000, 3689]
    ];

    data = [{ 
        label: "Total visitors", 
        data: d1, 
        color: '#e5412d' 
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

    

    var holder = $('#chart4');

    if (holder.length) {
        $.plot(holder, data, chartOptions );
    }


});