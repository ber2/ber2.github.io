---
layout: post
title:  "Automating hourly register forms"
date:   2020-09-26
categories: python automation scripts jinja latex
published: true
---

## Everybody fill up forms!

The __hourly register form__ is a document which will be familiar to paid company workers in Spain.

Introduced by law a couple of years ago, it makes everyone register at which time they start and
stop working every day. A report is filled at the end of each month, signed and archived, and never
to be seen again unless the company suffers an inspection or a legal problem arises.

We will not address the questions of deciding whether making everyone fill a form is a good idea or
whether the intended goal (controlling amount of unpaid overtime) has been achieved, although I very
much suspect both questions have a negative answer.

Instead of using the classic _punch clock_, the most frequent arrangement in my environment (tech
companies) is to have the worker fill a form following a template.

Of course, there are other more Orwellian solutions out there, involving software designed to help
companies, especially in these times of COVID lockdowns and working from home: just search for
"_[formulario registro
horario](https://www.google.com/search?channel=fs&client=ubuntu&q=formulario+registro+horario)_" and
shiver.


## Enter hourly-register

After getting bored with copy-pasting into Google Sheets templates, I decided to automate this.

__The goal:__ A user-worker-poor-guy should supply a small configuration file containing only
the necessary data, and an image with their signature. A PDF file should come out at the
other end with a signed report, ready to be submitted.

The result is __[hourly-register](https://github.com/ber2/hourly-register)__, and the output report
looks like this:

![Hourly Report](/assets/img/hourly-register.png)

## Strategy

- Read config from user provided `yaml` file
- Load, validate and generate necessary data in Python
- Render data into a `tex` file using [Jinja](https://palletsprojects.com/p/jinja/)
- Call `pdflatex` to get an output file

Below, I give a bit of detail about each of these steps.

### Reading config from YAML

For this type of project, I think [YAML](https://yaml.org/) is a good choice in terms of human
readability and, since I wanted to supply an detailed example, the ability to introduce comments was
handy. 

The really important bit, which is subject to change from month to month, is at the top:
```yaml
# Year and month of the report
year: 2020
month: 9

dates off:
  # Label here weekdays which you take off regulary, aka weekends.
  # Monday is 1, Sunday is 7; leave as it is for usual weekends.
  weekdays:
    - 6
    - 7

  # List of days during which you did not work, away from weekends.
  # These could be bank holidays or vacations
  holidays:
    - 11
    - 24
```

The rest of the config file should be customized with personal worker and company data, and is not
expected to change over time.
```yaml
# Hours at which you start work, stop for lunch break,
# get back to work, and finish.
working hours:
  - 9
  - 13
  - 14
  - 18

# Details of the worker, aka the person filling the report.
worker:
  name: "The Guy"  # Initials will be extracted from here
  dni: "12345678A"  # National ID number

  # Social security number, to be rendered as 
  # "08 / 12345678 / 15"
  ss_n:  
    - "08"
    - "12345678"
    - "15"

# Details about your employer
company:
  name: "The Boss"  # Company name
  workplace: "Home"  # Office location
  cif: "A12345678"  # Company's fiscal number, aka as NIF

  # Código de Cuenta de Cotización, aka, company's social security number.
  # To be rendered as:
  # "08 / 12345678 / 15"
  ccc:
    - "08"
    - "12345678"
    - "15"
```

### Script coding: Python 3.8

At work we mostly use 3.6 for the older stuff in production and I have been using mostly 3.7 locally
for data science. Time to get up to date, in spite of the fact that the 3.9 release is imminent.

Beyond Python version, there was more stuff I wanted to try.

#### A CLI 

I thought it was a good idea to have a CLI that could take parameters such as paths of input and
output files and, potentially, multiple commands. For me,
[click](https://click.palletsprojects.com/en/7.x/) is a great choice; I had been wanting to use it
from scratch in a project for a while.

I use it only at the script's entry point,
[`report.py`](https://github.com/ber2/hourly-register/blob/dev/report.py).

#### Data classes

I decided that data classes were a good way to encode the data which can generate the report.  See
[here]({% post_url 2020-09-24-dataclasses %}) for a recent post about using data classes, written
precisely after having coded this project.

In more detail, the approach that I have taken is the following:
1. Instantiate a data class with all the config coming from the YAML file.
2. Use the `__post_init__()` method to validate inputs (excluding input types) and to generate all
   extra data that will be used in the template rendering but can be automatically deduced from the
   original data.

Since I wanted to use the `__post_init__()` method to define new parameters, I resorted to mutable
data classes.

### Jinja templating

Jinja can be used as a means to template pretty much anything text-based, beyond HTML code. At work,
we use it on SQL scripts in order to generate table names automatically.

Regarding templating TeX documents, I found a couple of posts (in particular, one by [Brad
Erickson](http://eosrei.net/articles/2015/11/latex-templates-python-and-jinja2-generate-pdfs)) which
recommended using an _ad hoc_ Jinja environment because the default identification strings can
conflict with LaTeX commands.

However, on one hand I did not care about the LaTeX compatibility of [my
template](https://github.com/ber2/hourly-register/blob/dev/latex/template.tex) (i.e: I only wanted to
compile after templating) and, on the other hand, I used but little of the power that Jinja
supplies. For these reasons, I did not modify the default Jinja environment and I got away with it.

### Report generation in LaTeX

One could argue that it would be better to template a markdown file and then use
__[pandoc](https://pandoc.org/)__. 

While my love for markdown has grown over recent years, __[LaTeX](https://www.latex-project.org/)__
is an old love of mine: I learned it as a first-year undergraduate and during years I used it
exclusively for all my mathematical writing (including a PhD thesis written entirely in LaTeX on
Vim).

Admittedly, my familiarity with LaTeX marked my choice and markdown + pandoc would have been a
wonderful choice, with a softer learning curve.

The document uses few imports and should work in any of the more widely used distributions, such as
[TeX Live](https://www.tug.org/texlive/).

The chosen font,
[__Kp-Fonts__](https://osl.ugr.es/CTAN/fonts/kpfonts/doc/kpfonts.pdf), is an extra; in the case of
TeX Live on Ubuntu it is sufficient to install the `texlive-fonts-extra` package.
