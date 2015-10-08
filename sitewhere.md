

SiteWhere.org Install for Ubuntu (14.04)
----------------------------
    sudo su
    apt-get update -y
    apt-get install unzip openjdk-7-jdk

(I've been running it with Oracle Java 8, without any problems)

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
(requires email registration, to download from desktop, then upload to your ubuntu server)

    unzip hivemq-3.0.0.zip
    cd hivemq-3.0.0/bin
    ./run.sh &

Install Sitewhere Release Version
-----------

    cd /opt
    wget https://s3.amazonaws.com/sitewhere/sitewhere-server-1.2.0.tar.gz
    tar -zxvf sitewhere-server-1.2.0.tar.gz
    mv sitewhere-server-1.2.0 /opt/sitewhere
    sed -i -- 's/CATALINA_BASE/CATALINA_HOME/g' /opt/sitewhere/conf/sitewhere/sitewhere-server.xml
    export CATALINA_HOME=/opt/sitewhere
    cd /opt/sitewhere/bin
    ./startup.sh &

If you have something else running in port 8080, (e.g. tomcat, openhab) you obviously need to stop it or change ports. To change the port for SiteWhere, open the conf/server.xml file and look for the following:

    <Connector port="8080" protocol="HTTP/1.1"
               connectionTimeout="20000"
               redirectPort="8443" />
    Change the port to another value such as 9080

http://your-server-ip:9080/sitewhere/admin/server.html








http://docs.sitewhere.org/1.2.0/tutorials/openhab.html






install slamdata



http://your-server-ip:20223/slamdata/notebook.html#/sitewhere/tenant-default/OpenHAB+Test.slam/edit


SELECT * FROM "/sitewhere/tenant-default/events" where eventType = 'Measurements' and "measurements.name" = 'Temperature_Setpoint'










