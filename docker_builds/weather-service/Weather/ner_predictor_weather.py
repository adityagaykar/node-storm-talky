import nltk 
#from urllib.request import urlopen
from urllib2 import urlopen
import json
import sys

thunderstorm = u'\U0001F4A8'    # Code: 200's, 900, 901, 902, 905
drizzle = u'\U0001F4A7'         # Code: 300's
rain = u'\U00002614'            # Code: 500's
snowflake = u'\U00002744'       # Code: 600's snowflake
snowman = u'\U000026C4'         # Code: 600's snowman, 903, 906
atmosphere = u'\U0001F301'      # Code: 700's foogy
clearSky = u'\U00002600'        # Code: 800 clear sky
fewClouds = u'\U000026C5'       # Code: 801 sun behind clouds
clouds = u'\U00002601'          # Code: 802-803-804 clouds general
hot = u'\U0001F525'             # Code: 904
defaultEmoji = u'\U0001F300'    # default emojis
degree_sign= u'\N{DEGREE SIGN}'

def getEmoji(weatherID):
    if weatherID:
        if str(weatherID)[0] == '2' or weatherID == 900 or weatherID==901 or weatherID==902 or weatherID==905:
            return thunderstorm
        elif str(weatherID)[0] == '3':
            return drizzle
        elif str(weatherID)[0] == '5':
            return rain
        elif str(weatherID)[0] == '6' or weatherID==903 or weatherID== 906:
            return snowflake + ' ' + snowman
        elif str(weatherID)[0] == '7':
            return atmosphere
        elif weatherID == 800:
            return clearSky
        elif weatherID == 801:
            return fewClouds
        elif weatherID==802 or weatherID==803 or weatherID==803:
            return clouds
        elif weatherID == 904:
            return hot
        else:
            return defaultEmoji    # Default emoji

    else:
        return defaultEmoji   # Default emoji


#sample = sys.argv[1]
#sentences = nltk.sent_tokenize(sample)
#tokenized_sentences = [nltk.word_tokenize(sentence) for sentence in sentences]

sample = sys.argv[1]
sample = sample.replace("in", "of")
sample = sample.split(" ")
sample.remove("forecast")
sample = ' '.join(sample)

sentences = nltk.sent_tokenize(sample)
tokenized_sentences = [nltk.word_tokenize(sentence) for sentence in sentences]

for i in range(len(tokenized_sentences)):
    strg = ' '.join(tokenized_sentences[i])
    strg = strg.title()
    tokenized_sentences[i] = strg.split(" ")
   
tagged_sentences = [nltk.pos_tag(sentence) for sentence in tokenized_sentences]


def extract_entity_names(t, entity_type):
    entity_names = []
    if hasattr(t, 'label') and t.label:
        if t.label() == entity_type:
            entity_names.append(' '.join([child[0] for child in t]))
        else:
            for child in t:
                entity_names.extend(extract_entity_names(child, entity_type))
    return entity_names
 
places = []
chunked_sentences = nltk.ne_chunk_sents(tagged_sentences, binary=False)
for tree in chunked_sentences:
    places.extend(extract_entity_names(tree, "GPE"))
places=list(set(places))    

if (len(places)==0):
    places.append('Hyderabad')
for city in places:
    check_tmp = city
    check_tmp.lower()
    if "temp" in check_tmp:
	continue
    url = "http://api.openweathermap.org/data/2.5/weather?q="+city+"&units=metric&APPID=2eb05fdaeb42f99d947fa21f83a4a279"
    data = urlopen(url).read()
    response = json.loads(data)
    cityName = response.get('name')
    temp_current = response.get('main').get('temp')
    temp_max = response.get('main').get('temp_max')
    temp_min = response.get('main').get('temp_min')
    description = response.get('weather')[0].get('description')
    weatherID = response.get('weather')[0].get('id') 
    emoji = getEmoji(weatherID)
    cityName = cityName.encode('ascii','ignore').decode('ascii')
    if cityName!=city:
        sys.stdout.write("Did you mean: "+cityName+"<br/>")

    #print ("The Weather Condition of "+cityName+" is: ")
    #print ("Current Temperature: "+str(temp_current))
    #print ("Type: "+description)#+" "+emoji)
    sys.stdout.write("The Weather condition of "+cityName+" is: <br/>Current Temperature: "+str(temp_current)+"<br/>Type: "+description+"<br/>")
    sys.stdout.flush()
