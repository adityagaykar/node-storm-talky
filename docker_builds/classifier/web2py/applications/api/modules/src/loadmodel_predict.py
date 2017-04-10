# use natural language toolkit
import nltk
from nltk.stem.lancaster import LancasterStemmer
import os
import json
import datetime
import os
import sys
os.environ["THEANO_FLAGS"] = "mode=FAST_RUN,device=cpu,floatX=float32"
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

words=[]
classes=[]
with open('data', 'r') as f:
     words = json.load(f)

with open('classes', 'r') as f:
     classes = json.load(f)

stemmer = LancasterStemmer()

def clean_up_sentence(sentence):
    # tokenize the pattern
    sentence_words = nltk.word_tokenize(sentence)
    # stem each word
    sentence_words = [stemmer.stem(word.lower()) for word in sentence_words]
    return sentence_words

# return bag of words array: 0 or 1 for each word in the bag that exists in the sentence
def bow(sentence, words, show_details=False):
    # tokenize the pattern
    sentence_words = clean_up_sentence(sentence)
    # bag of words
    bag = [0]*len(words)  
    for s in sentence_words:
        for i,w in enumerate(words):
            if w == s: 
                bag[i] = 1
                if show_details:
                    print ("found in bag: %s" % w)

    return(np.array(bag))


test_data = []
test_input = sys.argv[1]


test_data.append([test_input, "x"])

X_test = []
Y_test = []

for test in test_data:
    #print (test[0])
    X_test.append(bow(test[0], words)) 

X_test = np.array(X_test)

#get model ready
model = Sequential()                                                
model.add(Dense(20,input_shape=(len(words),),init='uniform'))                      
model.add(Activation('sigmoid'))                                    
model.add(Dense(len(classes)))                                  
model.add(Activation('sigmoid'))                                    

batchSize = 1                    #-- Training Batch Size
num_classes = len(classes)            #-- Number of classes in CIFAR-10 dataset
num_epochs = 100                   #-- Number of epochs for training   
learningRate= 0.001               #-- Learning rate for the network
lr_weight_decay = 0.95

sgd = SGD(lr=learningRate, decay = lr_weight_decay)
model.load_weights('keras_w') 
model.compile(loss='categorical_crossentropy',
              optimizer='sgd',
              metrics=['accuracy'])

res = model.predict(X_test, verbose=0)
for test in res:
	print ("Predicted : ",classes[np.argmax(test)])



