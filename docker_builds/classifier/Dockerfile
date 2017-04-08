FROM gw000/keras:1.2.0-py2-th-cpu

# install dependencies from debian packages
RUN apt-get update -qq \
 && apt-get install --no-install-recommends -y \
    python-matplotlib \
    python-pillow

# install dependencies from python packages
RUN pip --no-cache-dir install \
    pandas \
    scikit-learn \
    statsmodels

# install your app
ADD $PWD/src /src
RUN chmod +x /src/loadmodel_predict.py

