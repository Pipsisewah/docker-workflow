```sh
amass enum -active -alts -brute -nocolor -min-for-recursive 2 -timeout 60 -config config/amass_config.yaml -d {args.fqdn} -o ./temp/amass.tmp
```
