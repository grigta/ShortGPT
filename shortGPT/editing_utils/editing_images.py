from shortGPT.api_utils.image_api import getBingImages
from shortGPT.gpt import openrouter
from tqdm import tqdm
import random
import math

def getImageUrlsTimed(imageTextPairs, use_generation=None):
    return [(pair[0], searchImageUrlsFromQuery(pair[1], use_generation=use_generation)) for pair in tqdm(imageTextPairs, desc='Search engine queries for images...')]



def searchImageUrlsFromQuery(query, top=3, expected_dim=[720,720], retries=5, use_generation=None):
    # use_generation: True — генерация через OpenRouter, False — только поиск,
    # None — авто (генерация, если выбрана image-модель).
    if use_generation is None:
        use_generation = bool(openrouter.get_selected_image_model())
    if use_generation:
        try:
            return openrouter.generate_image(query)
        except Exception as e:
            print("Ошибка генерации картинки через OpenRouter, откат к поиску Bing:", e)
    images = getBingImages(query, retries=retries)
    if(images):
        distances = list(map(lambda x: math.dist([x['width'], x['height']], expected_dim), images[0:top]))
        shortest_ones = sorted(distances)
        random.shuffle(shortest_ones)
        for distance in shortest_ones:
            image_url = images[distances.index(distance)]['url']
            return image_url
    return None
