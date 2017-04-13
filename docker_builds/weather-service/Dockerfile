FROM continuumio/miniconda:latest
ENV http_proxy http://10.4.20.103:8080
ENV https_proxy http://10.4.20.103:8080
RUN conda install nltk
ADD $PWD/Weather /src
RUN python -m nltk.downloader punkt
RUN python -m nltk.downloader averaged_perceptron_tagger 
RUN python -m nltk.downloader maxent_ne_chunker 
RUN conda install numpy
RUN python -m nltk.downloader words 
