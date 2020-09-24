---
layout: post
title:  "Automating hourly register forms"
date:   2020-09-20
categories: python automation scripts jinja latex
published: true
---

## Everybody fill up forms!

The __hourly register form__ is a document which will be familiar to paid company workers in Spain.

Introduced a couple of years ago, it aims at reducing the amount of non-paid extra hours that
workers are expected to do in certain environments by making everyone register at which time they
start and stop working every day. A report is filled at the end of the month and submitted, never to
be seen again unless the company suffers an inspection or a legal problem arises.

We will not address the questions of deciding whether making everyone fill a form is a good idea or
whether the intended goal has been achieved, although I very much suspect both questions have a
negative answer.

In many places, such as factories or large offices, this was already achieved by using a punch clock
(or an updated version with fingerprint scans) in which workers would record and prove that they
had been on time; this would be used to track attendance, log extra hours and, with little extra effort,
have someone produce the monthly hourly report. 

In smaller places, more _original_ proposals are on the table, consisting of phone apps where you
can log working hours, employee tracking software (recording what one is doing on a company provided
computer) and other solutions in the orwellian direction (just search for "_[formulario registro
horario](https://www.google.com/search?channel=fs&client=ubuntu&q=formulario+registro+horario)_").

Last but not least, most people in my context (small company/team/office and always in
front of a screen), will resort to filling up a template at the end of each month.
So every first day of the month, when our team's slackbot triggers a reminder, we go to a Google
Sheets template and fill in the details. In most cases, there is only one thing that truly changes
from month to month: the number of non-working days, comprising weekends, national holidays and
vacations. The rest of the datum (company details, worker details, start and stop hours) is
constant.

## Enter hourly-register ##

This task is a good candidate for automation and, after getting bored with copy-pasting into
templates, I was going to undertake it.

__The goal:__ A user-worker-poor-guy should only supply a small configuration file containing the
data and a PDF file should come out at the other end with a signed report, ready to be submitted.

The result is __[hourly-register](https://github.com/ber2/hourly-register)__.

I took the following strategy:
- Read config from a `yaml` file
- Load, validate and generate necessary data in python
- Render data into a `tex` file using [Jinja](https://palletsprojects.com/p/jinja/)
- Call `pdflatex` to get an output file
- Use several github tools for project management

I will explain all of these steps below except the last one, which is large enough to deserve a post
of its own.

## Reading config from YAML

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

## Script coding: Python 3.8

At work we mostly use 3.6 for the older stuff in production and I have been using mostly 3.7 for
data work on my machine. Time to get up to date, in spite of the fact that the 3.9 release is
imminent.

Beyond python version, there was more stuff I wanted to try.

### A CLI 

I thought it was a good idea to have a CLI that could take parameters such as paths of input and
output files and, potentially, multiple commands. For me,
[click](https://click.palletsprojects.com/en/7.x/) is a great choice; I had been wanting to use it
from scratch in a project for a while.

I use it only at the script's entrypoint, [`report.py`](https://github.com/ber2/hourly-register/blob/dev/report.py).

### Data classes

I decided that data classes were the right way to encode the data which can generate the report.
See [here]({% post_url 2020-09-24-dataclasses %}) for a recent post about using dataclasses, written
precisely after having coded this project.

In more detail, the approach that I have taken is the following:
1. Instantiate a dataclass with all the config coming from the YAML file.
2. Use the `__post_init__()` method to validate inputs (excluding input types) and to generate all
   extra data that will be used in the template rendering but can be automatically deduced from the
   original data.

Since I wanted to use the `__post_init__()` method to define new parameters, I resorted to mutable
dataclasses.

## Jinja templating

In order to go from a YAML config to a report in LaTeX, it is necessary to generate a TeX file which can be
then parsed by `pdflatex` or a similar program.

I have a certain degree of familiarity with [Jinja](https://jinja.palletsprojects.com/en/2.11.x/),
as I have used it for work on several occasions. This was an opportunity to use it in a project from
scratch.

Jinja seems to have a lot of usage at templating HTML code, but can be used as a means to template
pretty much anything text-based. At work, we use it in order to template SQL scripts and generate
table names automatically.

I looked up whether there were cases of Jinja templating applied to LaTeX documents and I found a
couple of posts (in particular, one by [Brad
Erickson](http://eosrei.net/articles/2015/11/latex-templates-python-and-jinja2-generate-pdfs)) which
recommended using an _ad hoc_ Jinja environment because the default identification strings can
conflict with the LaTeX commands.

How




## Report generation

- __Report generation: LaTeX__. Out of the many tools that can render text into a pdf, generating a
  `tex` file and calling `pdflatex` is a good choice given that I am comfortable with
  __[LaTeX](https://www.latex-project.org/)__ and it gives all sorts of control over output shape.
  _Alternative_: generating markdown and calling using __[pandoc](https://pandoc.org/)__.
