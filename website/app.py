from flask import Flask, render_template, request, jsonify
from extraction import get_data

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_data')
def data():

    cwid = request.args.get('cwid')
    password = request.args.get('password')

    return get_data(cwid=cwid, password=password)

if __name__ == '__main__':
    app.run(debug=True)
