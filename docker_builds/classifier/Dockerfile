FROM continuumio/miniconda:latest 
ENV http_proxy http://10.4.20.103:8080
ENV https_proxy http://10.4.20.103:8080
RUN conda install numpy scipy mkl matplotlib scikit-learn statsmodels nltk
EXPOSE 8000 443
# install your app
RUN python -m nltk.downloader punkt
RUN conda install Theano 
RUN conda install keras
ADD $PWD/web2py /web2py
WORKDIR /root
RUN mkdir -p .keras
RUN echo '{ \
    "image_dim_ordering": "tf", \
    "epsilon": 1e-07, \
    "floatx": "float32", \
    "backend": "theano" \
}' > /root/.keras/keras.json
WORKDIR /web2py
CMD python web2py.py --nogui -a admin -p 8000 -i 0.0.0.0
