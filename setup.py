from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in vanstation/__init__.py
from vanstation import __version__ as version

setup(
	name="vanstation",
	version=version,
	description="A simple Mobile Sales Module for mobile station rep ",
	author="Gross Invents",
	author_email="appdev@grossin.co",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
