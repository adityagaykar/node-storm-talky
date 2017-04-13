from gluon.custom_import import track_changes
track_changes(True)

from gluon import current
# use natural language toolkit
import nltk
from nltk.stem.lancaster import LancasterStemmer
import os
import json
import datetime
import os
import sys
#os.environ["THEANO_FLAGS"] = "mode=FAST_RUN,device=cpu,floatX=float32"
os.environ["THEANO_FLAGS"] = "base_compiledir=/home/www-data/theano_data"
import theano
import keras
import numpy as np
from keras.datasets import cifar10
from keras.models  import Sequential
from keras.layers import Dense, Dropout, Activation, Flatten
from keras.layers import Convolution2D, MaxPooling2D
from keras.optimizers import SGD
from keras.utils import np_utils
# import matplotlib.pyplot as plt
from keras import backend as K
K.set_image_dim_ordering('th')

class classifier:
    def __init__(self):        
        self.words=[]
        self.classes=[]
        data_file = open(os.path.join(current.request.folder, 'private', 'data'))
        classes_file = open(os.path.join(current.request.folder, 'private', 'classes'))
        with data_file as f:
             self.words = json.load(f)

        with classes_file as f:
             self.classes = json.load(f)
        self.model = self.get_model()
        

    def clean_up_sentence(self,sentence):
        # tokenize the pattern
        stemmer = LancasterStemmer()
        sentence_words = nltk.word_tokenize(sentence)
        # stem each word
        sentence_words = [stemmer.stem(word.lower()) for word in sentence_words]
        return sentence_words

    # return bag of words array: 0 or 1 for each word in the bag that exists in the sentence
    def bow(self, sentence, words, show_details=False):
        # tokenize the pattern
        sentence_words = self.clean_up_sentence(sentence)
        # bag of words
        bag = [0]*len(words)  
        for s in sentence_words:
            for i,w in enumerate(words):
                if w == s: 
                    bag[i] = 1
                    # if show_details:
                    #     print ("found in bag: %s" % w)
        return(np.array(bag))

    def get_model(self):
        #get model ready
        model = Sequential()                                                
        model.add(Dense(20,input_shape=(len(self.words),),init='uniform'))                      
        model.add(Activation('sigmoid'))                                    
        model.add(Dense(len(self.classes)))                                  
        model.add(Activation('sigmoid'))                                    

        batchSize = 1                    #-- Training Batch Size
        num_classes = len(self.classes)            #-- Number of classes in CIFAR-10 dataset
        num_epochs = 100                   #-- Number of epochs for training   
        learningRate= 0.001               #-- Learning rate for the network
        lr_weight_decay = 0.95

        sgd = SGD(lr=learningRate, decay = lr_weight_decay)
        model.load_weights(os.path.join(current.request.folder, 'private', 'keras_w'))
        model.compile(loss='categorical_crossentropy', optimizer='sgd',metrics=['accuracy'])
        return model

    def classify(self,message):
        X_test = []
        X_test.append(self.bow(message, self.words))
        X_test = np.array(X_test)
        res = self.model.predict(X_test, verbose=0)
        return self.classes[np.argmax(res[0])]

# classifier1 = classifier()
# print classifier1.classify("hello")

