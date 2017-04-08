FROM gw000/keras:1.2.0-py2-th-cpu
ENV HTTPS_PROXY=http://10.4.20.103:8080/
ENV HTTP_PROXY=http://10.4.20.103:8080/
# install dependencies from debian packages
RUN apt-get update -qq \
 && apt-get install --no-install-recommends -y \
    python-numpy \
    python-matplotlib \
    python-scipy
# install dependencies from python packages
RUN pip --no-cache-dir install \
    pandas \
    scikit-learn \
    statsmodels \
    nltk

# install your app
ADD $PWD/src /src
RUN chmod +x /src/loadmodel_predict.py

