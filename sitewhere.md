
Lets assume you have lots of buidlings to manage, hence lots of OpenHAB/PlegmaOpenBMS instances. You obviously need a backend server to collect all sensor data and idealy be able to control all available devices/hardware in realtime. Obviously the solution should be scalable (i.e. big data) as you will soon have millions/billions of sensor data records, and ideally it should not require a "new datacenter" for every client, so a multi-tenancy approach is required to save on cloud resources and deployment/maintenance overheads.  **[SiteWhere.org](http://www.sitewhere.org/) is an opensource project that can do exactly that.**

![](http://www.sitewhere.org/wp-content/uploads/2015/07/sitewhere-small.png) 

SiteWhere is The Open Platform for the Internet of ThingsTM – a system that choreographs data coming from and going to a web of connected devices.

It is build on Java Spring framework and integrates with plethora of enterprise grade opensource systems. Most important is probably the integration with Mule AnyPoint platform allowing SiteWhere data to be processed by the world's leading open ESB solution. This allows SiteWhere to interact with services such as Salesforce, DropBox, Amazon, and many of the other supported cloud providers. It also allows device event data to be executed within Mule flows for applying complex conditional logic. It also Integrates with WSO2 Siddhi for CEP (Complex Event Processing). SiteWhere event streams can be analyzed in real time, scanning for temporal conditions and firing events in response. It also integrates with Twilio for advance communication applications. For instance, SiteWhere can send device commands via Twilio SMS for cellular devices that do not support other protocols. It integrates with Apache Solr and includes a custom schema for SiteWhere device event data. SiteWhere data can be streamed into Solr where it can be indexed and made available for complex queries. Finally it also integrates with Hazelcast, Magento and WSO2 Identity Server

For persistance it supports MongoDB and Apache HBase. Both implementations are designed to store huge amounts of device data with high thoughput and low latency. MongoDB implementation can handle 10.000 events per second on a medium power cloud instance so that would be enough for our use case.

SiteWhere.org Install for Ubuntu (14.04)
----------------------------
I've been running it with Oracle Java 1.8.0_45 but openJDK should work without problems too.

    sudo su
    apt-get update -y
    apt-get install unzip openjdk-7-jdk


Install MongoDB
---------------

    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
    echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
    apt-get update
    apt-get install -y mongodb-org
    echo "mongodb-org hold" | sudo dpkg --set-selections
    echo "mongodb-org-server hold" | sudo dpkg --set-selections
    echo "mongodb-org-shell hold" | sudo dpkg --set-selections
    echo "mongodb-org-mongos hold" | sudo dpkg --set-selections
    echo "mongodb-org-tools hold" | sudo dpkg --set-selections
    service mongod start

Install HiveMQ
----------
SiteWhere event source interfaces allows it to receive input from all types of devices supporting many protocols out of the box including **MQTT, Stomp, AMQP, JMS, WebSockets**, direct socket connections, and many more. OpenHAB sensor data/events/commands can be exchanged over **MQTT** so here is our perfect protocol match. MQTT is a light-weight, open and scalable protocol ideal for the Internet of Things with near real time delivery of messages in an efficient, cost-effective way, even in unreliable networks.  MQTT requires a message broker and HimeMQ is an enterprise grade one, written in Java. It asks for email registration to download, so it's easier to get it from a local machine and then upload it to your ubuntu server.

    unzip hivemq-3.0.0.zip
    cd hivemq-3.0.0/bin
    ./run.sh &

Install Sitewhere Release Version 1.2.0
-----------

    cd /opt
    wget https://s3.amazonaws.com/sitewhere/sitewhere-server-1.2.0.tar.gz
    tar -zxvf sitewhere-server-1.2.0.tar.gz
    mv sitewhere-server-1.2.0 /opt/sitewhere
    sed -i -- 's/CATALINA_BASE/CATALINA_HOME/g' /opt/sitewhere/conf/sitewhere/sitewhere-server.xml
    export CATALINA_HOME=/opt/sitewhere
    cd /opt/sitewhere/bin
    ./startup.sh &

If you have something else running in port 8080, (e.g. openhab) you obviously need to stop it or change ports. To change the port for SiteWhere, open the conf/server.xml file and look for the following:

    <Connector port="8080" protocol="HTTP/1.1"
               connectionTimeout="20000"
               redirectPort="8443" />
    Change the 8080 port to another value such as 9080

http://your-server-ip:9080/sitewhere/admin/server.html

At this point you should see the demo server, with a demo site, locations, assets, devices etc.
![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/sitewhere1.png)

You can ofcourse create a new site, those are essensially your buildings.
![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/sitewhere2.png)
At this point, you will need a Plegma OpenBMS / OpenHAB server, to add the sitewhere addon jar
Details here: http://docs.sitewhere.org/1.2.0/tutorials/openhab.html

In summary, you need to download the OSGi Bundle: https://s3.amazonaws.com/sitewhere-openhab/org.openhab.persistence.sitewhere-1.7.0-SNAPSHOT.jar
which will communicate over MQTT with the sitewhere server. 

In order for openHAB to send all events to SiteWhere, add a file named sitewhere.persist in the configurations/persistence folder. This file is in the standard openHAB persistence format. The configuration below will send all events to SiteWhere:

		Strategies {
		   everyHour   : "0 0 * * * ?"
		   everyDay    : "0 0 0 * * ?"
		
		   // if no strategy is specified for an item entry below, the default list will be used
		   default = everyChange
		}
		
		/*
		 * Each line in this section defines for which item(s) which strategy(ies) should be applied.
		 * You can list single items, use "*" for all items or "groupitem*" for all members of a group
		 * item (excl. the group item itself).
		 */
		Items {
		   * : strategy = everyChange, everyDay, restoreOnStartup
		}

Ok, if you start Plegma OpenBMS / OpenHAB it should be connected with a SiteWhere server, and you should be able to see measurements going to sitewhere, as well as send commands back to openhab.

![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/sitewhere3.png)

For this solution to be complete, you will have to create a customer facing frontend. Unfortunately there are not many ready to use out of the box sollutions for that. Sitewhere will provide everything you need from a backend server, over it's REST service, and it's endless integration options via Mule, but you still need to create someking of a custom frontend HTML site. Here is the source and video for a map based frontend example: https://github.com/sitewhere/sitewhere-examples 

[![Airtraffic sitewhere demo](http://img.youtube.com/vi/37rOuQ3DKx0/0.jpg)](https://www.youtube.com/watch?v=37rOuQ3DKx0)

However, there is a quick and dirty way to get a visual user interface an the data comming from OpenHAB. You can install SLAMDATA and work directly on the MongoDB almost without writing any code! and potentially you could create a dashboard mashup with slamdata charts and reports.

![](https://media.licdn.com/media/p/6/005/088/002/039b9f8.png)
[SlamData](http://slamdata.com/) Visual Analytics for NoSQL

SlamData is an open source solution that makes it easy for people to see and understand modern NoSQL data, without relocation or transformation. With connectors to MongoDB and other sources of NoSQL data, SlamData employs the industry's most advanced pushdown technology to keep data processing and analytics close to the data. SlamData's high-level, cloud-deployable interface allows anyone to explore, refine and aggregate complex NoSQL data, and to build beautiful reports and visualizations that can be embedded in any web page, mobile app or web app.

Following their getting started instructions, http://slamdata.com/documentation you need to download their easy installer. In our case for ubuntu just execute:

	chmod +x slamdata_unix_<version>.sh
	./slamdata_unix_<version>.sh

and after answering a few easy questings, slamdata is up and running! On first look, there is nothing spectacular.

![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/slamdata1.png)

However, if you mount to your mongodb like this

![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/slamdata2.png)

you can see the Plegma OpenBMS data
http://your-server-ip:20223/slamdata/notebook.html#/sitewhere/tenant-default/

![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/slamdata3.png)

Ok so what ? well, now it's really simple to query them (way more simple than http://robomongo.org/ other mongodb GUI) because you can use a dead-simple SQL like syntax.
http://slamdata.com/support/cheatsheet.pdf

	SELECT * FROM "/sitewhere/tenant-default/events" where eventType = 'Measurements' and "measurements.name" = 'Temperature_Setpoint'
	
and with two clicks you can get a chart.
http://slamdata.com/documentation/front-end-manual/#visualization

![](https://raw.githubusercontent.com/wiki/ellak-monades-aristeias/PlegmaOpenBMS/slamdata4.png)

which can be embeded in any HTML dashboard among with reports, forms etc. (more details at the front end manual)

Concluting, Plegma OpenBMS combined with SiteWhere with SlamData do not create a "ready to use with real customers" solution, but they get pretty close :-)





