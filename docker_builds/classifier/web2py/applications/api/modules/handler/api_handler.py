
import json

class ApiHandler():

	def __init__(self):
		pass

	# def handle_register(self, request):
	# 	req_vars = request.vars
	# 	req_args = request.args
	# 	result = ""
		
	# 	config = req_vars["config"]
	# 	service_name = req_vars["service_name"]
	# 	if service_name != None and config != None:
	# 		rows = db(db.service.name == service_name and db.service.config == config).select()
	# 		if rows == 0:
	# 			curr_id = db.service.insert(name=service_name,config=config)
	# 			result = db(db.service.id == curr_id).select().first()["token"]
	# 			result = { "access_token" : result }
	# 		else:
	# 			result = {"access_token" : rows.first()["token"]}				
	# 	return result

	# def handle_invoke(self, request):
	# 	token = req_vars["access_token"]
	# 	result = "Error"
	# 	if token != None:
	# 		row = db(db.service.token == token).select().first()
	# 		service_name = row["name"]
	# 		config = json(row["config"])
	# 		image = config["image"]
	# 		command = config["command"]

	# 		client = docker.Client()
	# 		container = client.create_container(image=image, command=command)
	# 		result = dockerpty.start(client, container)
	# 	return result
