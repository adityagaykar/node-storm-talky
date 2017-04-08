# use natural language toolkit
import nltk
from nltk.stem.lancaster import LancasterStemmer
import os
import json
import datetime
import os
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
import matplotlib.pyplot as plt
from keras import backend as K
import simplejson
K.set_image_dim_ordering('th')

stemmer = LancasterStemmer()

training_data = []

with open("train.data") as f:
    data = f.read();
    data = data.split("\n")
    data = [ i.split(",") for i in data ]
    data = [ [i.strip("\"").lower() for i in line] for line in data]
    for line in data:
        training_data.append({"class":line[1],"sentence":line[0]})

words = []
classes = []
documents = []
ignore_words = ['?']
# loop through each sentence in our training data
for pattern in training_data:
    # tokenize each word in the sentence
    w = nltk.word_tokenize(pattern['sentence'])
    # add to our words list
    words.extend(w)
    # add to documents in our corpus
    documents.append((w, pattern['class']))
    # add to our classes list
    if pattern['class'] not in classes:
        classes.append(pattern['class'])

# stem and lower each word and remove duplicates
words = [stemmer.stem(w.lower()) for w in words if w not in ignore_words]
words = list(set(words))

# remove duplicates
classes = list(set(classes))
training = []
output = []

# create an empty array for our output
output_empty = [0] * len(classes)

# training set, bag of words for each sentence
for doc in documents:
    # initialize our bag of words
    bag = []
    # list of tokenized words for the pattern
    pattern_words = doc[0]
    # stem each word
    pattern_words = [stemmer.stem(word.lower()) for word in pattern_words]
    # create our bag of words array
    for w in words:
        bag.append(1) if w in pattern_words else bag.append(0)

    training.append(bag)
    # output is a '0' for each tag and '1' for current tag
    output_row = list(output_empty)
    output_row[classes.index(doc[1])] = 1
    output.append(output_row)

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

#get model ready
model = Sequential()                                                
model.add(Dense(20,input_shape=(len(words),),init='uniform'))                      
model.add(Activation('sigmoid'))                                    
model.add(Dense(len(classes)))                                      
model.add(Activation('sigmoid'))                                    

batchSize = 1                    #-- Training Batch Size
num_classes = len(classes)                  #-- Number of classes in CIFAR-10 dataset
num_epochs = 100                   #-- Number of epochs for training   
learningRate= 0.001               #-- Learning rate for the network
lr_weight_decay = 0.95

sgd = SGD(lr=learningRate, decay = lr_weight_decay)
model.compile(loss='categorical_crossentropy',
              optimizer='sgd',
              metrics=['accuracy'])


X_train = np.array(training)
Y_train = np.array(output)

test_data = []
test_data.append(["weather in thane","weather"])
test_data.append(["news updates for today", "news"])
test_data.append(["places to visit in pune","google"])
test_data.append(["what is your name","google"])
test_data.append(["will it rain today","weather"])

X_test = []
Y_test = []

for test in test_data:
    X_test.append(bow(test[0], words))
    output_row = list(output_empty)
    output_row[classes.index(test[1])] = 1
    Y_test.append(output_row)    

X_test = np.array(X_test)
Y_test = np.array(Y_test)

#-- switch verbose=0 if you get error "I/O operation from closed file"
history = model.fit(X_train, Y_train, batch_size=batchSize, nb_epoch=num_epochs,
          verbose=1, shuffle=True, validation_data=(X_test, Y_test))

model.save_weights('keras_w')

with open('data', 'w') as f:
     json.dump(words, f)

with open('classes', 'w') as f:
     json.dump(classes, f)
