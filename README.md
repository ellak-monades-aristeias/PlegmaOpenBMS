## [Plegma Labs](http://pleg.ma)
[Plegma Labs](http://pleg.ma) is a startup from Athens, Greece. We provide tailor made “Internet of Things” solutions mostly focused on the smart building & energy verticals. Some of our solutions are based on this enriched version openHAB running in a RPi/BBB/NUC acting as an integration platform/gateway.

### Plegma modules include:

- **HTML5 responsive user interface** based on Angular JS, Bootstrap and Highcharts
compatible with openhab rest api
  atmosphere is utilized for single value items
  secure login via user/pass login
  angular templates used for ui widgets
  zoomable line/bar/stacked bar charts with calendar selection
  pies and quages
  multiple sitemaps
  screenshots available at: http://pleg.ma/screenshots

- **Enhanced plegma mysql persistence** supporting delta functions (needed for hourly, daily, weekly, monthly barcharts) including web service for chart data feeds

- **SMA sunny webbox** solar binder. The Sunny WebBox is a monitoring solution for medium-sized PV plants.
  http://www.sma-america.com/products/monitoring-control/sunny-webbox.html


- **Janitza UMG 96 RM** power analyser binder. The UMG 96RM is a very compact and powerful universal measurement device, mainly designed for use in low and medium voltage distribution systems. http://www.janitza.com/products/energy-measurement/umg-96-rm/overview
via HTTP binder consuming our custom API (html files uploaded in the power analyser)
  https://github.com/PlegmaLabs/openhab/tree/Plegma_1.5.1/distribution/openhabhome/configurations/transform/janitza/pleg

- **Plugwise** 
via HTTP binder consuming plugwise “source web server” with our custom API 
  https://github.com/PlegmaLabs/openhab/tree/Plegma_1.5.1/distribution/openhabhome/configurations/transform/plugwise

Incomplete/highly experimental work:
- **Nimbits** cloud server persistence 
Nimbit Server provides web services that can process time and geo stamped data that trigger calculations, statistics, alerts and more. It can be installed on Debian Based systems which means you can run it on a Raspberry Pi, Ubuntu Server, or Cloud Services like Google app Engine and Amazon EC2.
http://www.nimbits.com


- **z.wave.me** razberry binder<br>
The Razberry platform adds all the components needed to turn a Raspberry PI board into a fully operational and inexpensive ZWave gateway
http://razberry.z-wave.me

