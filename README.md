## Plegma Labs
Plegma Labs is a Greek startup which provides tailor made “Internet of Things” solutions in the Greek market. We have been experimenting with openhab for more than a year and we are using it as the core integration platform in some of our customer’s projects. To that extent we have developed a number of binders, to support specific client requirements usually focused around building energy monitoring. As we have benefited ourselves from open source, we feel we should contribute back these addons we have made for openhab. Unfortunately being a startup means our resources are very limited, so it extremely difficult to find time to fully document and refactor our work in order to enable smooth integration with openhab, however we will try our best towards this direction.

New modules include:

HTML5 user interface based on Angular JS, Bootstrap and Highcharts
compatible with openhab rest api
	atmosphere is utilized for single value items
	angular templates used for ui widgets
	supports zoomable line/bar/ stacked bar charts with calendar selection and pies
	secure login via user/pass login
	supports multiple sitemaps
openhab\distribution\openhabhome\webapps\canvas
For screenshots see here: http://pleg.ma/gallery

Enhanced mysql persistence supporting delta functions (needed for hourly, daily, weekly, monthly barcharts) including web service for chart data feeds
org.openhab.persistence.psql

SMA sunny webbox solar binder 
http://www.sma-america.com/products/monitoring-control/sunny-webbox.html
org.openhab.binding.sunnywebbox

Janitza UMG 96 RM power analyser binder
http://www.janitza.com/products/energy-measurement/umg-96-rm/overview
via HTTP binder consuming custom API (html files uploaded in the power analyser)
openhab\distribution\openhabhome\configurations\transform\janitza\pleg

Plugwise 
via HTTP binder consuming plugwise “source web server” custom API 
openhab\distribution\openhabhome\configurations\transform\plugwise

Incomplete/highly experimental work:
Nimbits cloud server persistence
Nimbit Server provides web services that can process time and geo stamped data that trigger calculations, statistics, alerts and more. It can be installed on Debian Based systems which means you can run it on a Raspberry Pi, Ubuntu Server, or Cloud Services like Google app Engine and Amazon EC2.
http://www.nimbits.com
org.openhab.persistence.nimbits

z.wave.me razberry binder
http://razberry.z-wave.me
org.openhab.binding.zwaveme (based on http binder)


## Trademark Disclaimer
Product names, logos, brands and other trademarks referred to within the openHAB website are the property of their respective trademark holders. These trademark holders are not affiliated with openHAB or our website. They do not sponsor or endorse our materials.