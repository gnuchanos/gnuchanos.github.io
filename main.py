from pyscript import document
import time, webbrowser






helpInfo = """
---------------------------------------------------------
__|Welcome To GnuChanOS : first one is command -> comment
___| youtube -> open youtube channel
___| github -> my project
___| itch.io -> this is public project
___| twitter -> you know what is this
___| linkedin -> profile page


"""



class GnuChanWEB:
    def __init__(self) -> None:
        self.help = ""

    def InputText(self, InputID="None"): # .value = get Value
        self.UserInput = document.querySelector("#"+InputID)
        return self.UserInput

    def OutputText(self, OutputID="None", Value="", NewLine=False): #.innerText = "this is text"
        self.UserOutput = document.querySelector("#"+OutputID)
        if NewLine:
            self.UserOutput.innerText += Value + "\n"
        else:
            self.UserOutput.innerText += Value
        return self.UserOutput

def moreInputAndOutput(event):
    newInput = GnuChanWEB().InputText(InputID="input")
    newOutput = GnuChanWEB().OutputText(NewLine=True, OutputID="output", Value=newInput.value)

    if newInput.value == "help":
        output_div = GnuChanWEB().OutputText(NewLine=True, OutputID="output", Value=helpInfo)
    elif newInput.value == "youtube":
        webbrowser.open("https://www.youtube.com/@GnuChanOS")
    elif newInput.value == "itch.io":
        webbrowser.open("https://gnuchanos.itch.io/")
    elif newInput.value == "github":
        webbrowser.open("https://github.com/gnuchanos")
    elif newInput.value == "twitter":
        webbrowser.open("https://twitter.com/GnuChanOS")
    elif newInput.value == "linked":
        webbrowser.open("https://www.linkedin.com/in/kubilay-yalcin-5b0233292/")
    elif newInput.value == "":
        pass
    newInput.value = ""
    


if __name__ == "__main__":
    output_div = GnuChanWEB().OutputText(NewLine=True, OutputID="output", Value="\nif you new to this place enter help command")


    # i have loop problem i need fix this
    currentTime = time.localtime()
    #Hour/Minute/Second
    clock = document.querySelector("#time")
    clock.innerText = time.strftime("%H:%M:%S", currentTime)
    # day/month/Year
    day = document.querySelector("#cal")
    day.innerText = time.strftime("%d.%m.%Y", currentTime) 

