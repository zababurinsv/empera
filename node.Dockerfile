FROM ubuntu:16.04
FROM node:16

WORKDIR /user/src/empera

# Way 1: download data from scratch (may work long)
RUN mkdir /user/src/empera/DATA
RUN wget http://dappsgate.com/files/jinn-db.zip > /user/src/empera/DATA/jinn-db.zip
RUN unzip -o jinn-db.zip -d /user/src/empera/DATA

# Way 2: use external data
# COPY DATA /user/src/empera/DATA

COPY Source /user/src/empera/source

RUN apt update \ 
 && apt-get install unzip  \
 && apt-get install -y git \
 && apt-get install -y nodejs \
 && apt-get install -y npm \
 && npm install pm2 -g

RUN apt -y install build-essential

RUN cd /user/src/empera/source \
 && npm install \
 && node set httpport:8080 password:default_password

EXPOSE 8080
EXPOSE 30000

CMD cd /user/src/empera/source/ && pm2 start run-node.js && tail -f /dev/null
