---
layout: post
title:  "Automating hourly register forms"
date:   2020-09-20
categories: python automation scripts jinja latex
published: true
---

## Everybody fill up forms ##

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

### Dataclasses

It seems that a significant amount of work has been done in recent python versions in order to
provide type-checking, such as hinting. Personally, I have grown more and more concerned about type
safety, especially after learning Scala. Providing type hints and using `mypy` along `pytest` has
become a staple in my TDD, clean-coding workflow.

Python [dataclasses](https://docs.python.org/3.8/library/dataclasses.html) could perhaps be
described as a best effort to obtain something that looks like a Scala [case
class](https://docs.scala-lang.org/tour/case-classes.html). However, parallelism breaks beyond
declaration and instantiation (both allow passing in typed parameters and have automated
instantiation), and behaviours are rather different, mostly due to the nature of both programming
languages:
- At the end of the day, Python is dynamically typed and checking the types of attributes in
  dataclasses at runtime is just as bad an idea as checking types of variables elsewhere. Mypy can
  help here, but don't expect a dataclass to raise an exception during runtime because it received a
  string instead of an integer.
- Dataclasses can be _frozen_, meaning that attribute updates after init will raise a `TypeError`
  exception.  This is a next-best to having an immutable value, but remember that everything in
  python is mutable at the end of the day.

Since dataclasses provide automatic `__init__()` methods, they also provide an interesting
`__post_init__()` method, that runs automatically afterwards.

For the purposes of the hourly-reports project, I have taken the following approach:
1. Instantiate a dataclass with all the config coming from the YAML file.
2. Use the `__post_init__` method to validate inputs (excluding input types) and to generate all
   extra data that will be used in the template rendering but can be automatically deduced from the
   original data.

One important caveat: if you freeze the dataclass, you will not be able to define new parameters
after init. For this reason, we have had to resort to mutable dataclasses.

As an example, this is what the dataclass for a worker config looks like:

```python
from dataclasses import dataclass, field
import re
from typing import List


class InvalidDocument(ValueError):
    pass


def is_valid_dni(document: str) -> bool:
    doc_upper = document.upper()
    pattern = re.compile(r"[0-9]{7,8}[A-Z]{1}")
    return bool(re.fullmatch(pattern, doc_upper))


@dataclass
class Worker:
    name: str
    dni: str
    ss_n: List[str]
    ss_n_repr: str = field(init=False, repr=False)
    initials: str = field(init=False, repr=False)

    def __post_init__(self):
        if not is_valid_dni(self.dni):
            raise InvalidDocument("Document number %s is not a valid DNI" % self.dni)
        if not is_valid_ss_n(self.ss_n):
            raise InvalidDocument(
                "Document number %s is not a valid social security number" % self.ss_n
            )
        self.ss_n_repr = " / ".join(self.ss_n)
        self.initials = "".join([w[0].upper() for w in self.name.split(" ")])
```

## Jinja templating



## Report generation

- __Report generation: LaTeX__. Out of the many tools that can render text into a pdf, generating a
  `tex` file and calling `pdflatex` is a good choice given that I am comfortable with
  __[LaTeX](https://www.latex-project.org/)__ and it gives all sorts of control over output shape.
  _Alternative_: generating markdown and calling using __[pandoc](https://pandoc.org/)__.
