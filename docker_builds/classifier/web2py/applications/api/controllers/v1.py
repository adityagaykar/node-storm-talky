import docker
import cPickle
import json

def register():
    # result = api_handler.handle_register(request)
    req_vars = request.vars
    req_args = request.args
    result = ""
    
    config = req_vars["config"]
    service_name = req_vars["service_name"]
    if service_name != None and config != None:
        row = db(db.service.name == service_name and db.service.config == config).select().first()
        if row == None:
            curr_id = db.service.insert(name=service_name,config=config)
            result = db(db.service.id == curr_id).select().first()["token"]
            result = { "access_token" : result }
        else:
            result = {"access_token" : row["token"]}               
    return response.json(result)

def invoke():
    # result = api_handler.handle_invoke(request)
    req_vars = request.vars
    token = req_vars["access_token"]
    result = "Error"
    if token != None:
        row = db(db.service.token == token).select().first()
        service_name = row["name"]
        config = json.loads(row["config"])
        image = config["image"]
        command = config["command"]

        
        # container = client.api.create_container(image=image, command=command)
        # result = dockerpty.start(client, container)
        try:
            client = docker.from_env()
            result = client.containers.run(image,command)
        except Exception as e:
            result = image + " " + command + str(e)
    return response.json(result)    
