"""file to manage all dependencies"""

from gluon import current

from handler.api_handler import ApiHandler
from src.loadmodel import classifier

bot_classifier = classifier()
current.bot_classifier = bot_classifier
api_handler = ApiHandler()
