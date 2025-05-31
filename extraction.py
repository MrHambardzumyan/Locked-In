from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from dotenv import load_dotenv

url = "https://deanza.instructure.com/"

def get_data(cwid, password):
    try:
        # Configurations
        waiting_time = 20

        # Webdriver setup
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        driver = webdriver.Chrome(chrome_options)

        driver.get(url)

        username = WebDriverWait(driver, waiting_time).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/div/div[1]/div[1]/form/div[1]/div/div/input"))
        )
        username.send_keys(cwid)
        
        password_input = WebDriverWait(driver, waiting_time).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/div/div[1]/div[1]/form/div[2]/div/div/input"))
        )
        password_input.send_keys(password)

        submit = WebDriverWait(driver, waiting_time).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/div/div[1]/div[1]/form/button[1]"))
        )
        submit.click()

        assignements_raw_data = WebDriverWait(driver, waiting_time).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[3]/div[2]/div/div[2]/div[1]/div/div/div[3]"))
        )
 

        """
        Extract more data

        assignements_raw_data_preload_count = len(assignements_raw_data.text)
        while(assignements_raw_data_preload_count == 0):
            assignements_raw_data = WebDriverWait(driver, waiting_time).until(
                EC.presence_of_element_located((By.XPATH, "/html/body/div[3]/div[2]/div/div[2]/div[1]/div/div/div[3]"))
            )
            assignements_raw_data_preload_count = len(assignements_raw_data.text)
            time.sleep(1)
            print("Retrying!")

        load_more = WebDriverWait(driver, waiting_time).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[3]/div[2]/div/div[2]/div[1]/div/div/div[3]/div/div[10]/div/button"))
        )
        load_more.click()

        while True:
            assignements_raw_data = WebDriverWait(driver, waiting_time).until(
                EC.presence_of_element_located((By.XPATH, "/html/body/div[3]/div[2]/div/div[2]/div[1]/div/div/div[3]"))
            )
            
            assignements_raw_data_loaded_count = len(assignements_raw_data.text)

            if(assignements_raw_data_preload_count < assignements_raw_data_loaded_count):
                break

            time.sleep(1)
        """
        
        assignements_text = assignements_raw_data.text
  
        return assignements_text
    except:
        message = "Data extraction failed. Please try again!"

        return message