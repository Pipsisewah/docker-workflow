import re
import json
from flask import Flask, request
app = Flask(__name__)


def parse_amass_file(file_path):
    try:
        asns = []
        cidr_subnets = []
        isps = []
        ipv4_addresses = []
        with open(file_path, 'r') as file:
            for line in file:
                line = line.strip()
                if "contains" in line:
                    cidr_subnets.append(line.split("\n")[0])
                if "announces" in line:
                    asns.append(line.split("\n")[0])
                if "managed_by" in line:
                    isps.append(line.split("\n")[0])
                ipv4_match = re.search(r'\d+\.\d+\.\d+\.\d+', line)
                if ipv4_match:
                    ipv4_addresses.append(ipv4_match.group())
        return {
            "asns": asns,
            "cidr_subnets": cidr_subnets,
            "isps": isps,
            "ipv4_addresses": ipv4_addresses
        }
    except Exception as e:
        print("[!] Unable to pull IPs and/or ASNs...")
        print(f"[!] Exception: {e}")


def get_ips_from_amass(file):
    result = parse_amass_file(file)
    thisFqdn = {'ips': []}
    thisFqdn['asns'] = result["asns"]
    thisFqdn['subnets'] = result["cidr_subnets"]
    thisFqdn['isps'] = result["isps"]
    for ip_address in result["ipv4_addresses"]:
        exists = False
        for ip_obj in thisFqdn['ips']:
            if ip_address == ip_obj['ip']:
                exists = True
        if exists == False:
            data = {
                "ip": ip_address,
                "ports": []
            }
            thisFqdn['ips'].append(data)
    return thisFqdn


def amass_get_dns(file):
    amass_file = open(file, 'r')
    amass_file_lines = amass_file.readlines()
    amass_file.close()
    dns = {
        "arecord": [],
        "aaaarecord": [],
        "cnamerecord": [],
        "mxrecord": [],
        "txtrecord": [],
        "node": [],
        "nsrecord": [],
        "srvrecord": [],
        "ptrrecord": [],
        "spfrecord": [],
        "soarecord": []
    }
    for line in amass_file_lines:
        if "a_record" in line and "aaaa_record" not in line:
            dns['arecord'].append(line.split("\n")[0])
        if "aaaa_record" in line:
            dns['aaaarecord'].append(line.split("\n")[0])
        if "cname_record" in line:
            dns['cnamerecord'].append(line.split("\n")[0])
        if "mx_record" in line:
            dns['mxrecord'].append(line.split("\n")[0])
        if "txt_record" in line:
            dns['txtrecord'].append(line.split("\n")[0])
        if "node" in line:
            dns['node'].append(line.split("\n")[0])
        if "ns_record" in line:
            dns['nsrecord'].append(line.split("\n")[0])
        if "srv_record" in line:
            dns['srvrecord'].append(line.split("\n")[0])
        if "ptr_record" in line:
            dns['ptrrecord'].append(line.split("\n")[0])
        if "spf_record" in line:
            dns['spfrecord'].append(line.split("\n")[0])
        if "soa_record" in line:
            dns['soarecord'].append(line.split("\n")[0])
    return dns


def amass(file):
       #config_test = subprocess.run(["ls config/amass_config.yaml"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
       #if config_test.returncode == 0:
       #    print("[+] Amass config file detected!  Scanning with custom settings...")
       #    subprocess.run([f"amass enum -active -alts -brute -nocolor -min-for-recursive 2 -timeout 60 -config config/amass_config.yaml -d {args.fqdn} -o ./temp/amass.tmp"], shell=True)
       #else:
       #    print("[!] Amass config file NOT detected!  Scanning with default settings...")
       #    subprocess.run([f"amass enum -active -alts -brute -nocolor -min-for-recursive 2 -timeout 60 -d {args.fqdn} -o ./temp/amass.tmp"], shell=True)
    amass_arr = []
    filename = f'./app-volume/{file}'
    with open(filename, 'r') as f:
        for line in f:
            try:
                domain_pattern = r'([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
                match = re.search(domain_pattern, line)
                if match:
                    domain = match.group(1)
                    amass_arr.append(domain)
            except Exception as e:
                print(f"[!] Error processing line: {line}")
                print(f"[!] Exception: {e}")
    thisFqdn = get_ips_from_amass(filename)
    thisFqdn['fqdn'] = 'example.com'
    thisFqdn['dns'] = amass_get_dns(filename)
    final_amass_arr = []
    for amass_finding in amass_arr:
        if thisFqdn['fqdn'] in amass_finding and amass_finding not in final_amass_arr:
            final_amass_arr.append(amass_finding)
    # update_fqdn_obj(args, thisFqdn)
    return json.dumps(thisFqdn, indent=2)


@app.route('/')
def parse():
    file = request.args.get('file')
    tool = request.args.get('tool')
    if tool == 'amass':
        results = amass(file)
        return f'<p>{results}</p>'
    else:
        return '<h1>cool</h1>'


if __name__ == '__main__':
    app.run(debug=True)
